const User = require('../models/User');
const { translateError } = require('../middleware/i18n');

// 获取用户设置
const getUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t('errors.not_found')
      });
    }
    
    res.json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    console.error('获取用户设置失败:', error);
    res.status(500).json({
      success: false,
      message: req.t('errors.server_error')
    });
  }
};

// 更新用户设置
const updateUserSettings = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, theme, language } = req.body;
    
    const updateData = {};
    
    if (emailNotifications !== undefined) {
      updateData['preferences.emailNotifications'] = emailNotifications;
    }
    
    if (smsNotifications !== undefined) {
      updateData['preferences.smsNotifications'] = smsNotifications;
    }
    
    if (theme !== undefined) {
      updateData['preferences.theme'] = theme;
    }
    
    if (language !== undefined) {
      updateData['preferences.language'] = language;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t('errors.not_found')
      });
    }
    
    res.json({
      success: true,
      message: req.t('success.updated_success'),
      data: user.preferences
    });
  } catch (error) {
    console.error('更新用户设置失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => translateError(err.message, req.getLocale()));
      return res.status(400).json({
        success: false,
        message: req.t('errors.validation_error'),
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: req.t('errors.server_error')
    });
  }
};

// 获取支持的语言列表
const getSupportedLanguages = (req, res) => {
  try {
    const supportedLocales = req.getSupportedLocales();
    
    const languages = supportedLocales.map(locale => ({
      code: locale,
      name: req.t(`language.${locale}`),
      nativeName: req.t(`language.native_${locale}`)
    }));
    
    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    console.error('获取支持语言列表失败:', error);
    res.status(500).json({
      success: false,
      message: req.t('errors.server_error')
    });
  }
};

// 更新用户语言偏好
const updateUserLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    
    if (!language) {
      return res.status(400).json({
        success: false,
        message: req.t('errors.validation_error')
      });
    }
    
    const supportedLocales = req.getSupportedLocales();
    if (!supportedLocales.includes(language)) {
      return res.status(400).json({
        success: false,
        message: req.t('errors.validation_error'),
        errors: [req.t('settings.invalid_language')]
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { 'preferences.language': language } },
      { new: true, runValidators: true }
    ).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: req.t('errors.not_found')
      });
    }
    
    // 设置cookie
    res.cookie('lang', language, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
      httpOnly: true,
      sameSite: 'strict'
    });
    
    res.json({
      success: true,
      message: req.t('success.updated_success'),
      data: user.preferences
    });
  } catch (error) {
    console.error('更新用户语言失败:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => translateError(err.message, req.getLocale()));
      return res.status(400).json({
        success: false,
        message: req.t('errors.validation_error'),
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: req.t('errors.server_error')
    });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  getSupportedLanguages,
  updateUserLanguage
};