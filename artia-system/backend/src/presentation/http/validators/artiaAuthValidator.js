import { body } from 'express-validator';

export const artiaAuthValidation = {
  login: [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Senha é obrigatória')
      .isLength({ min: 1 })
      .withMessage('Senha não pode estar vazia')
  ],

  validateToken: [
    body('artiaToken')
      .notEmpty()
      .withMessage('Token Artia é obrigatório')
      .isString()
      .withMessage('Token deve ser uma string')
  ]
};
