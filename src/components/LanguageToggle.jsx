import React, { useEffect, useState } from 'react';

/** Shared Thai/English toggle powered by Google Translate, used by every role. */
export default function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState('th');

  useEffect(() => {
    const getCookie = (name) => {
      const parts = (`; ${document.cookie}`).split(`; ${name}=`);
      return parts.length === 2 ? parts.pop().split(';').shift() : null;
    };

    const cookie = getCookie('googtrans');
    setCurrentLang(cookie && cookie.includes('/en') ? 'en' : 'th');

    // Create the hidden Google Translate widget only once across all navbars.
    if (!document.getElementById('google_translate_hidden_element')) return;
    if (!document.getElementById('google-translate-script') && !window.google?.translate) {
      window.googleTranslateElementInit = () => {
        if (window.google?.translate && document.getElementById('google_translate_hidden_element')) {
          new window.google.translate.TranslateElement(
            { pageLanguage: 'th', includedLanguages: 'en,th', autoDisplay: false },
            'google_translate_hidden_element'
          );
        }
      };
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const toggleLanguage = (event) => {
    event?.stopPropagation();
    const targetLang = currentLang === 'th' ? 'en' : 'th';
    const value = `/th/${targetLang}`;
    document.cookie = `googtrans=${value}; path=/`;
    document.cookie = `googtrans=${value}; domain=${window.location.hostname}; path=/`;
    setCurrentLang(targetLang);
    window.location.reload();
  };

  return (
    <>
      <div id="google_translate_hidden_element" style={{ display: 'none' }} />
      <button type="button" className="btn-lang-toggle" onClick={toggleLanguage} aria-label="Switch language">
        {currentLang === 'th' ? 'EN' : 'Thai'}
      </button>
    </>
  );
}
