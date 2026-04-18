import { Router } from "express";
import { UserModel } from "../../db/models/user.js";
import { signToken, verifyToken } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: "جميع الحقول مطلوبة",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
      return;
    }

    const existing = UserModel.findByEmail(email);
    if (existing) {
      res.status(409).json({
        success: false,
        error: "البريد مستخدم بالفعل",
      });
      return;
    }

    await UserModel.create(username, email, password, displayName);
    const user = UserModel.findByEmail(email)!;

    const token = signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "خطأ في التسجيل" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = UserModel.findByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        error: "بريد أو كلمة مرور خاطئة",
      });
      return;
    }

    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) {
      res.status(401).json({
        success: false,
        error: "بريد أو كلمة مرور خاطئة",
      });
      return;
    }

    UserModel.updateLastLogin(user.id);
    const token = signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "خطأ في تسجيل الدخول" });
  }
});

router.post("/guest", (_req, res) => {
  const sessionId = uuidv4();
  res.json({
    success: true,
    guestSessionId: sessionId,
    message:
      "يمكنك الآن حفظ السجلات. سيتم حفظها أيضاً في متصفحك.",
  });
});

router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.json({ success: true, user: null, isGuest: true });
    return;
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.json({ success: true, user: null, isGuest: true });
    return;
  }

  const user = UserModel.findById(payload.userId);
  if (!user) {
    res.json({ success: true, user: null, isGuest: true });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
    },
    isGuest: false,
  });
});

export default router;
