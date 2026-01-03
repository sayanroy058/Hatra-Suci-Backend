import { settingsCache } from './cache.js';

// Helper function to get settings with caching
export const getSetting = async (Settings, key, defaultValue = null) => {
  // Check cache first
  const cached = await settingsCache.get(key);
  if (cached !== null) {
    return cached;
  }

  // Query database if not in cache
  const setting = await Settings.findOne({ key }).lean(); // Use lean() for better performance
  const value = setting ? setting.value : defaultValue;
  
  // Store in cache
  await settingsCache.set(key, value);
  
  return value;
};

// Helper to invalidate cache when settings are updated
export const invalidateSettingCache = async (key) => {
  if (key) {
    await settingsCache.delete(key);
  } else {
    await settingsCache.clear();
  }
};

// Helper to get multiple settings at once
export const getSettings = async (Settings, keys, defaultValues = {}) => {
  const results = {};
  const keysToFetch = [];
  
  // Check cache for each key
  for (const key of keys) {
    const cached = await settingsCache.get(key);
    if (cached !== null) {
      results[key] = cached;
    } else {
      keysToFetch.push(key);
    }
  }
  
  // Fetch missing keys from database in one query
  if (keysToFetch.length > 0) {
    const settings = await Settings.find({ key: { $in: keysToFetch } }).lean();
    
    for (const setting of settings) {
      results[setting.key] = setting.value;
      await settingsCache.set(setting.key, setting.value);
    }
    
    // Add default values for keys not found
    for (const key of keysToFetch) {
      if (results[key] === undefined) {
        results[key] = defaultValues[key] || null;
        await settingsCache.set(key, results[key]);
      }
    }
  }
  
  return results;
};
