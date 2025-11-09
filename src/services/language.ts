import { getAvailableLanguages, getCurrentMessages } from '../locales';
import { LANGUAGES, Language } from '../types/language';
import { StorageService } from './storage';

export type LanguageChangeCallback = (language: Language) => void;

/**
 * Language Management Service
 * Uses singleton pattern to manage application language state
 */
export class LanguageService {
  private static instance: LanguageService;
  private currentLanguage: Language;
  private callbacks: Set<LanguageChangeCallback> = new Set();

  private constructor() {
    // Try to read saved language settings from storage, use default if not found
    const savedLanguage = StorageService.getSavedLanguage();
    this.currentLanguage = savedLanguage || 'en';
  }

  /**
   * Get language service singleton instance
   */
  static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setLanguage(language: Language): void {
    if (language !== this.currentLanguage) {
      this.currentLanguage = language;
      // Save to storage
      StorageService.saveLanguage(language);
      this.notifyLanguageChange();
    }
  }

  /**
   * Get messages for current language
   */
  getMessages() {
    return getCurrentMessages(this.currentLanguage);
  }

  /**
   * Get available languages list
   */
  getAvailableLanguages(): Language[] {
    return getAvailableLanguages();
  }

  /**
   * Get language configuration info
   */
  getLanguageConfig(language: Language) {
    return LANGUAGES[language];
  }

  /**
   * Get all language configurations
   */
  getAllLanguageConfigs() {
    return LANGUAGES;
  }

  /**
   * Register language change callback
   */
  onLanguageChange(callback: LanguageChangeCallback): () => void {
    this.callbacks.add(callback);

    // Return unregister function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all listeners that language has changed
   */
  private notifyLanguageChange(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentLanguage);
      } catch (error) {
        console.error('Error in language change callback:', error);
      }
    });
  }

  /**
   * Create language selection menu options
   */
  createLanguageMenuChoices() {
    return this.getAvailableLanguages().map(code => {
      const config = this.getLanguageConfig(code);
      return {
        name: config.nativeName,
        value: code,
        description: config.name
      };
    });
  }
}

// Export singleton instance for direct use
export const languageService = LanguageService.getInstance();