const express = require("express");
const { register, verifyRegistration, resendCode, login, adminLogin, adminForgotPassword, adminResetPassword, me, session, logout, forgotPassword, resetPassword } = require("../controllers/authController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/register/verify", verifyRegistration);
router.post("/register/resend", resendCode);
router.post("/login", login);
router.post("/admin/login", adminLogin);
router.post("/admin/forgot-password", adminForgotPassword);
router.post("/admin/reset-password", adminResetPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, me);
router.get("/session", optionalAuth, session);
router.post("/logout", requireAuth, logout);

module.exports = router;
