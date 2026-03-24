export class AuthController {
  async me(req, res, next) {
    try {
      if (!req.authProfile) {
        return res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: req.authProfile.toJSON()
        }
      });
    } catch (error) {
      return next(error);
    }
  }
}
