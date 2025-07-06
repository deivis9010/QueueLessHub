const express = require('express');
const router = express.Router();
const AuthController = require('../controller/auth.controller');

// Registro
router.post('/register', AuthController.register);
// Login
router.post('/login', AuthController.login);

module.exports = router;
