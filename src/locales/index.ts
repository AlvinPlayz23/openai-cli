import { Language, Messages } from '../types/language';
import { en } from './lang/en';
import { zh } from './lang/zh';

const availableMessages: Partial<Record<Language, Messages>> = {
  zh,
  en
};

export const getCurrentMessages = (lang: Language): Messages => {
  // If requested language is not available, fallback to English
  return availableMessages[lang] || availableMessages.en || en;
};

export const getAvailableLanguages = (): Language[] => {
  return Object.keys(availableMessages) as Language[];
}; 