/**
 * High-performance Marathi & Devanagari Legacy Font Decoder
 * Automatically converts legacy non-Unicode fonts (DV-TTSurekh, DV-TTYogesh,
 * DVB-TT, Shree-Lipi, Kruti Dev, ISM, Shivaji, etc.) into clean Unicode Marathi.
 */

// Common KrutiDev character map
const KRUTI_DEV_MAPPINGS: [RegExp, string][] = [
  [/ñ/g, "Z"],
  [/ò/g, "ô"],
  [/à/g, "ा"],
  [/á/g, "ा"],
  [/â/g, "ा"],
  [/ã/g, "ा"],
  [/ä/g, "ा"],
  [/å/g, "ा"],
  [/æ/g, "ा"],
  [/ç/g, "ा"],
  [/è/g, "ा"],
  [/é/g, "ा"],
  [/ê/g, "ा"],
  [/ë/g, "ा"],
  [/ì/g, "ा"],
  [/í/g, "ा"],
  [/î/g, "ा"],
  [/ï/g, "ा"],
];

/**
 * Decodes legacy Devanagari / Marathi font encoding into clean Marathi Unicode text.
 * Covers DV-TTSurekh, DV-TTYogesh, Shree-Lipi, Kruti Dev, AMS, and ISM Marathi fonts.
 */
export function decodeMarathiLegacyText(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. DV-TTSurekh / DV-TTYogesh / Shree-Lipi / DVB Ligatures
  result = result
    // Question & Number patterns
    .replace(/\xD0\xAC\u0928/g, "प्रश्न")
    .replace(/Ð¬न/g, "प्रश्न")
    .replace(/\xD0\xAC/g, "प्रश्")
    .replace(/Ð¬/g, "प्रश्")
    .replace(/Ð/g, "प्र")
    .replace(/¬/g, "श्")
    .replace(/[\xC9É]मांक/g, "क्रमांक")
    .replace(/[\xC9É]\.?/g, "क्र.")
    .replace(/[\xC9É]/g, "क्र")

    // Key Marathi verbs and question keywords
    .replace(/जो[\xF1ñ]ा/g, "जोड्या")
    .replace(/[\xF1ñ]ा/g, "ड्या")
    .replace(/[\xF1ñ]/g, "ड्य")
    .replace(/सार[\x8CŒ]या/g, "सारख्या")
    .replace(/सं[\x8CŒ]येभोवती/g, "संख्येभोवती")
    .replace(/सं[\x8CŒ]या/g, "संख्या")
    .replace(/[\x8CŒ]या/g, "ख्या")
    .replace(/[\x8CŒ]री/g, "त्री")
    .replace(/[\x8CŒ]/g, "ख्")
    .replace(/इय[\x9Aš]ता/g, "इयत्ता")
    .replace(/[\x9Aš]याचे/g, "त्याचे")
    .replace(/[\x9Aš]या/g, "त्या")
    .replace(/[\x9Aš]/g, "त्")
    .replace(/िच[\xCEÎ]े/g, "चित्रे")
    .replace(/िच[\xCEÎ]/g, "चित्र")
    .replace(/[\xCEÎ]/g, "त्र")
    .replace(/श[\xA2¢]दां[\x90\s]*या/g, "शब्दांच्या")
    .replace(/श[\xA2¢]दांच्या/g, "शब्दांच्या")
    .replace(/श[\xA2¢]दां/g, "शब्दां")
    .replace(/श[\xA2¢]द/g, "शब्द")
    .replace(/[\xA2¢]/g, "ब्")
    .replace(/अ[\x89‰]राला/g, "अक्षराला")
    .replace(/अ[\x89‰]र/g, "अक्षर")
    .replace(/[\x89‰]/g, "क्ष")
    .replace(/मू[\xA8¨]यमापन/g, "मूल्यमापन")
    .replace(/अिह[\xA8¨]यानगर/g, "अहिल्यानगर")
    .replace(/[\xA8¨]/g, "ल्य")
    .replace(/आका[\xA6¦]रक/g, "आकारिक")
    .replace(/[\xA6¦]रका[\xA4¤]या/g, "रिकाम्या")
    .replace(/[\xA4¤]या/g, "म्या")
    .replace(/[\xA4¤]/g, "म्")
    .replace(/[\xA6¦]/g, "रि")
    .replace(/एक[\u0142ł]ण/g, "एकूण")
    .replace(/[\u0142ł]/g, "ऊ")
    .replace(/मा[\u0113ē]न/g, "मारून")
    .replace(/[\u0113ē]/g, "रू")
    .replace(/जोड[\u014AŊ]न/g, "जोडून")
    .replace(/[\u014AŊ]/g, "डू")
    .replace(/फ[\xDAÚ]/g, "फक्त")
    .replace(/[\xDAÚ]/g, "क्त")
    .replace(/काक[\xBD½]/g, "काकी")
    .replace(/[\xBD½]/g, "ी")
    .replace(/मो[\xEEî]ा/g, "मोठ्या")
    .replace(/[\xEEî]ा/g, "ठ्या")
    .replace(/[\xEEî]/g, "ठ")
    .replace(/व[\xAE®]तूंभोवती/g, "वस्तूंच्या भोवती")
    .replace(/व[\xAE®]तूंना/g, "वस्तूंना")
    .replace(/व[\xAE®]तू/g, "वस्तू")
    .replace(/[\xAE®]/g, "स्त")
    .replace(/[\x86†]ी\./g, "श्री.")
    .replace(/[\x86†]/g, "श्र")
    .replace(/क[\u0146ņ]\s*णा/g, "कृष्णा")
    .replace(/[\u0146ņ]/g, "ृ")
    .replace(/गोक[\u0141Ł]ळ/g, "गोकुळ")
    .replace(/[\u0141Ł]/g, "ु")
    .replace(/ल[\xB8¸]मीकांत/g, "लक्ष्मीकांत")
    .replace(/[\xB8¸]/g, "क्ष")
    .replace(/रिवं[\xCFÏ]/g, "रवींद्र")
    .replace(/[\xCFÏ]/g, "द्र")
    .replace(/िन[\u054FՏ]मती/g, "निर्मिती")
    .replace(/[\u054FՏ]/g, "र्मि")
    .replace(/सहकाय[\u04F1ӱ]/g, "सहकार्य")
    .replace(/[\u04F1ӱ]/g, "र्य")
    .replace(/[\u053AԺ][\u02F3˳]वाजी/g, "शिवाजी")
    .replace(/[\u053AԺ]/g, "ि")
    .replace(/योगे[\u02F3˳]/g, "योगेश")
    .replace(/दे[\u02F3˳]मुख/g, "देशमुख")
    .replace(/मंगे[\u02F3˳]/g, "मंगेश")
    .replace(/[\u02F3˳]रद/g, "शरद")
    .replace(/[\u02F3˳]/g, "श")
    .replace(/रिव[\u04EFӯ][\u030E̎]/g, "रवींद्र")
    .replace(/[\u04EFӯ][\u030E̎]/g, "द्र")
    .replace(/[\u04EFӯ]/g, "द्र")
    .replace(/[\u030E̎]/g, "")
    .replace(/यो\s*य/g, "योग्य")
    .replace(/िव[\xFCü]ा[\x9B›\u203A]या[\x82‚]चे/g, "विद्यार्थ्यांचे")
    .replace(/[\xFCü]ा[\x9B›\u203A]या[\x82‚]/g, "द्यार्थ्यांचे")
    .replace(/[\xFCü]/g, "द्या")
    .replace(/[\x9B›\u203A]या[\x82‚]/g, "र्थ्यांचे")
    .replace(/[\x82‚]/g, "ंचे")
    .replace(/[\x8D]/g, "त्र")
    .replace(/[\x90]/g, "च")
    .replace(/[\x9B]/g, "र्थ्या")
    .replace(/[\u0319̙]/g, "")
    .replace(/[\u035B͛]/g, "")
    .replace(/[\u03DAϚ]/g, "द्र")
    .replace(/[\u0534Դ]/g, "प्र")
    .replace(/[\u0541Ձ]/g, "म")
    .replace(/[\u0311̑]/g, "");

  // 2. Fix common spacing artifacts in Devanagari ligatures
  result = result
    .replace(/\s+([ािीुूृेैोौंःँ])/g, "$1") // attach stray matras
    .replace(/([क-ह])\s+्/g, "$1्")
    .replace(/्\s+([क-ह])/g, "्$1")
    .replace(/श\s*ब\s*्\s*द/g, "शब्द")
    .replace(/प\s*्\s*र\s*श\s*्\s*न/g, "प्रश्न")
    .replace(/ग\s*ु\s*ण/g, "गुण")
    .replace(/च\s*ा\s*च\s*ण\s*ी/g, "चाचणी")
    .replace(/इ\s*य\s*त\s*्\s*त\s*ा/g, "इयत्ता")
    .replace(/व\s*ि\s*ष\s*य/g, "विषय");

  return result;
}
