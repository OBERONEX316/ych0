const fs = require('fs');
const path = require('path');

// 支持的语种列表
const supportedLocales = ['zh-CN', 'en-US'];
const defaultLocale = 'zh-CN';

// 加载所有语言文件
const loadLocales = () => {
  const localesDir = path.join(__dirname, '../config/locales');
  const locales = {};
  
  supportedLocales.forEach(locale => {
    const filePath = path.join(localesDir, `${locale}.json`);
    if (fs.existsSync(filePath)) {
      try {
        locales[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.error(`Error loading locale file ${locale}:`, error);
        locales[locale] = {};
      }
    }
  });
  
  return locales;
};

const allLocales = loadLocales();

// 国际化中间件
const i18nMiddleware = (req, res, next) => {
  // 从请求头、查询参数或cookie中获取语言设置
  let locale = defaultLocale;
  
  // 1. 检查查询参数
  if (req.query.lang && supportedLocales.includes(req.query.lang)) {
    locale = req.query.lang;
  }
  // 2. 检查请求头
  else if (req.headers['accept-language']) {
    const acceptLanguage = req.headers['accept-language'];
    const languages = acceptLanguage.split(',').map(lang => {
      const [language, quality = 'q=1'] = lang.split(';');
      return {
        lang: language.trim(),
        quality: parseFloat(quality.replace('q=', ''))
      };
    });
    
    // 按质量排序并选择第一个支持的语言
    languages.sort((a, b) => b.quality - a.quality);
    const preferredLang = languages.find(l => 
      supportedLocales.includes(l.lang) || 
      supportedLocales.includes(l.lang.split('-')[0])
    );
    
    if (preferredLang) {
      locale = supportedLocales.find(l => 
        l === preferredLang.lang || l.startsWith(preferredLang.lang.split('-')[0])
      ) || defaultLocale;
    }
  }
  // 3. 检查cookie
  else if (req.cookies && req.cookies.lang && supportedLocales.includes(req.cookies.lang)) {
    locale = req.cookies.lang;
  }
  
  // 设置响应头
  res.setHeader('Content-Language', locale);
  
  // 添加翻译函数到req对象
  req.t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = allLocales[locale];
    
    // 遍历键路径
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        // 如果当前语言找不到，尝试默认语言
        if (locale !== defaultLocale) {
          let defaultTranslation = allLocales[defaultLocale];
          for (const k of keys) {
            if (defaultTranslation && defaultTranslation[k] !== undefined) {
              defaultTranslation = defaultTranslation[k];
            } else {
              return key; // 返回原始键
            }
          }
          translation = defaultTranslation;
        } else {
          return key; // 返回原始键
        }
        break;
      }
    }
    
    // 如果是字符串，替换参数
    if (typeof translation === 'string') {
      return Object.keys(params).reduce((str, param) => {
        return str.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
      }, translation);
    }
    
    return translation || key;
  };
  
  // 添加获取当前语言的方法
  req.getLocale = () => locale;
  
  // 添加获取支持语言列表的方法
  req.getSupportedLocales = () => supportedLocales;
  
  next();
};

// 错误消息国际化函数
const translateError = (error, locale = defaultLocale) => {
  if (typeof error === 'string') {
    const keys = error.split('.');
    let translation = allLocales[locale];
    
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        return error;
      }
    }
    
    return translation || error;
  }
  
  if (error.message) {
    return translateError(error.message, locale);
  }
  
  return error.toString();
};

module.exports = {
  i18nMiddleware,
  translateError,
  supportedLocales,
  defaultLocale
};