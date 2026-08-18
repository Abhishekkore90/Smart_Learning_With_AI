import React from "react";

export interface MDMCertificateProps {
  subTab?: "1-5" | "6-8" | "1-8";
  reportYear?: number;
  marathiMonthName?: string;
  reportSchoolName?: string;
  principalName?: string;
  teacherName?: string;
  primaryCookedDays?: number;
  upperCookedDays?: number;
  wednesdaysCount?: number;
  certSupplementaryFood?: string;
  certMonthName?: string;
  certPatPrimary?: string;
  certPatUpper?: string;
  certBeneficiaryPrimary?: string;
  certBeneficiaryUpper?: string;
  certPrimaryCookedDays?: string;
  certUpperCookedDays?: string;
  certWednesdaysCount?: string;
  primaryEnrolled?: number;
  upperEnrolled?: number;
  primaryBeneficiarySum?: number;
  upperBeneficiarySum?: number;
  cookCount?: number | string;
  helperCount?: number | string;
  onCookCountChange?: (count: string) => void;
  onHelperCountChange?: (count: string) => void;
  helperCenterPay?: number;
  helperStatePay?: number;
  helperTotalPay?: number;
  primaryCenterGrant?: number;
  primaryStateGrant?: number;
  upperCenterGrant?: number;
  upperStateGrant?: number;
  primaryKendraShare?: string;
  primaryRajyaShare?: string;
  upperKendraShare?: string;
  upperRajyaShare?: string;
  totalGrantAll?: number;
  vegUsageKg?: number;
}

// Marathi number converter helper
const toMarathiNumbers = (str: string | number): string => {
  if (str === undefined || str === null) return "";
  const numStr = str.toString();
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return numStr.replace(/[0-9]/g, (digit) => marathiDigits[parseInt(digit, 10)]);
};

// English number converter helper
const toEnglishNumbers = (str: string | number): string => {
  if (str === undefined || str === null) return "";
  const numStr = str.toString();
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return numStr.replace(/[०-९]/g, (digit) => marathiDigits.indexOf(digit).toString());
};

export const MDMCertificate: React.FC<MDMCertificateProps> = ({
  subTab = "1-8",
  reportYear,
  marathiMonthName = "",
  reportSchoolName = "",
  principalName = "",
  teacherName = "",
  primaryCookedDays = 0,
  upperCookedDays = 0,
  wednesdaysCount = 0,
  certSupplementaryFood = "",
  certMonthName = "",
  certPatPrimary = "",
  certPatUpper = "",
  certBeneficiaryPrimary = "",
  certBeneficiaryUpper = "",
  certPrimaryCookedDays = "",
  certUpperCookedDays = "",
  certWednesdaysCount = "",
  primaryEnrolled = 0,
  upperEnrolled = 0,
  primaryBeneficiarySum = 0,
  upperBeneficiarySum = 0,
  cookCount = "2",
  helperCount = "2",
  onCookCountChange,
  onHelperCountChange,
  helperCenterPay = 0,
  helperStatePay = 0,
  helperTotalPay = 0,
  primaryCenterGrant = 0,
  primaryStateGrant = 0,
  upperCenterGrant = 0,
  upperStateGrant = 0,
  primaryKendraShare = "1.55",
  primaryRajyaShare = "1.04",
  upperKendraShare = "1.55",
  upperRajyaShare = "1.04",
  totalGrantAll = 0,
  vegUsageKg,
}) => {
  const showPrimary = subTab === "1-5" || subTab === "1-8";
  const showUpper = subTab === "6-8" || subTab === "1-8";

  const totalPrimaryGrant = primaryCenterGrant + primaryStateGrant;
  const totalUpperGrant = upperCenterGrant + upperStateGrant;

  const currentTotalGrant =
    subTab === "1-5"
      ? totalPrimaryGrant
      : subTab === "6-8"
      ? totalUpperGrant
      : totalGrantAll;

  // Honorarium calculations: ₹1900 per Cook (स्वयंपाकी) and ₹600 per Helper (मदतनीस)
  const cookNum = Math.max(0, parseInt(cookCount?.toString() || "0", 10) || 0);
  const helperNum = Math.max(0, parseInt(helperCount?.toString() || "0", 10) || 0);

  const cookHonorarium = cookNum * 1900;
  const helperHonorarium = helperNum * 600;
  const totalHonorarium = cookHonorarium + helperHonorarium;

  const getHeaderTitle = () => {
    if (subTab === "1-5") return "इयत्ता १ ते ५";
    if (subTab === "6-8") return "इयत्ता ६ ते ८";
    return "इयत्ता १ ते ८";
  };

  const getFormattedMonthYear = () => {
    if (certMonthName) return certMonthName;
    if (marathiMonthName && reportYear) {
      return `${marathiMonthName} ${toMarathiNumbers(reportYear.toString())}`;
    }
    if (marathiMonthName) return marathiMonthName;
    if (reportYear) return toMarathiNumbers(reportYear.toString());
    return "________";
  };

  const renderCountInputs = () => (
    <div className="flex flex-col items-center justify-center gap-1.5 p-1 text-xs">
      <div className="flex items-center justify-between gap-1 w-full">
        <span className="text-[11px] font-extrabold text-slate-900 whitespace-nowrap">स्वयंपाकी:</span>
        <input
          type="number"
          min="0"
          step="1"
          value={cookCount !== undefined && cookCount !== null ? cookCount : "2"}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onCookCountChange?.(e.target.value);
          }}
          className="w-14 text-center font-black bg-amber-50/90 border border-amber-400 rounded px-1 py-0.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:bg-transparent print:w-auto"
        />
      </div>
      <div className="flex items-center justify-between gap-1 w-full">
        <span className="text-[11px] font-extrabold text-slate-900 whitespace-nowrap">मदतनीस:</span>
        <input
          type="number"
          min="0"
          step="1"
          value={helperCount !== undefined && helperCount !== null ? helperCount : "2"}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onHelperCountChange?.(e.target.value);
          }}
          className="w-14 text-center font-black bg-amber-50/90 border border-amber-400 rounded px-1 py-0.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:bg-transparent print:w-auto"
        />
      </div>
    </div>
  );

  return (
    <div className="print-page border border-slate-300 py-4 sm:py-6 px-3 sm:px-8 bg-white text-black font-sans text-xs relative w-full max-w-full mx-auto shadow-md flex flex-col justify-between overflow-x-auto print:w-full print:h-auto print:border-none print:shadow-none print:p-0 print:overflow-x-visible">
      <div className="min-w-[700px] md:min-w-0 w-full flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="relative flex justify-center items-center font-bold text-sm mb-3 border-b-2 border-black pb-2">
          <div className="text-base font-extrabold text-center">- प्रमाणपत्र -</div>
          <div className="absolute right-0 text-sm font-extrabold">{getHeaderTitle()}</div>
        </div>
        <div className="text-right text-xs font-bold mb-3">
          माहे : <span className="font-extrabold border-b border-dotted border-black px-4">{getFormattedMonthYear()}</span>
        </div>

        {/* Certificate Text Paragraph */}
        <div className="text-justify text-xs leading-[1.8rem] space-y-2 px-2 font-normal text-black mb-4">
          <p>
            अध्यक्ष/ सचिव शाळा व्यवस्थापन समिती <span className="font-bold border-b border-dotted border-black px-3">{principalName || "________"}</span> कडून प्रमाणित करणेत येते की,
            जि.प. शाळा <span className="font-bold border-b border-dotted border-black px-3">{reportSchoolName || "________"}</span> या शाळेतील{" "}
            <span className="font-bold border-b border-dotted border-black px-3">{teacherName || "________"}</span> यांनी शालेय पोषण आहार अंतर्गत माहे{" "}
            <span className="font-bold border-b border-dotted border-black px-2">{getFormattedMonthYear()}</span> मध्ये{" "}
            {showPrimary && (
              <>
                इ. १ ली ते ५ वी च्या विद्यार्थ्यांसाठी <span className="font-bold border-b border-dotted border-black px-3">{certPrimaryCookedDays ? toMarathiNumbers(certPrimaryCookedDays) : "________"}</span> दिवस{" "}
              </>
            )}
            {showPrimary && showUpper && "आणि "}
            {showUpper && (
              <>
                इ. ६ वी ते ८ वीच्या विद्यार्थ्यांसाठी एकूण <span className="font-bold border-b border-dotted border-black px-3">{certUpperCookedDays ? toMarathiNumbers(certUpperCookedDays) : "________"}</span> दिवस{" "}
              </>
            )}
            अन्न शिजवून देणेचे काम केले आहे. तसेच योग्य उष्मांकाचा व चविष्ठ पोषण आहार होणेसाठी दररोज इ. १ ली ते ५ वी साठी ५० ग्रॅम व इ. ६वी ते ८ वी साठी ७५ ग्रॅम प्रमाणे
            विविध भाज्या वापरल्या आहेत. आणि खोबरे, कांदा, लसून इ. मसाल्यांचा योग्य प्रमाणात वापर केला आहे. सदर महिन्यात दर बुधवारी एकूण <span className="font-bold border-b border-dotted border-black px-3">{certWednesdaysCount ? toMarathiNumbers(certWednesdaysCount) : "________"}</span> वेळा <span className="font-bold border-b border-dotted border-black px-3">{certSupplementaryFood || "________"}</span> असा पूरक आहार दिलेला आहे. अन्न शिजवून देणेचे व महाराष्ट्र शासन, शालेय शिक्षण व क्रिडा विभागातील शासन निर्णय क्र.शापोआ / २०१०/प्र.क्र.१८/ प्राशि४, दि.२.२.२०११ मधील बाब क्र. ९ नुसार शालेय पोषण आहाराचे सर्व कामकाज पूर्ण केले आहे.
          </p>
          <p>
            सदर खालीलप्रमाणे पट, लाभार्थी, दिवस यांची माहिती बरोबर असून त्यानुसार इंधन भाजीपाला तसेच स्वयंपाकी तथा मदतनीस मानधन अदा करणेस हरकत नाही म्हणून दिले असे प्रमाणपत्र.
          </p>
        </div>

        {/* 10-Column Data Table */}
        <div className="mt-4 w-full">
          <table className="w-full min-w-[850px] border-collapse border border-black text-center text-xs font-sans" style={{ borderCollapse: 'collapse', border: '1px solid #000000' }}>
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-black text-xs">
                <th className="border border-black p-1.5 min-w-[55px]" style={{ border: '1px solid #000000' }}>इयत्ता</th>
                <th className="border border-black p-1.5 min-w-[45px]" style={{ border: '1px solid #000000' }}>पट</th>
                <th className="border border-black p-1.5 min-w-[70px]" style={{ border: '1px solid #000000' }}>शिजवलेले दिवस</th>
                <th className="border border-black p-1.5 min-w-[80px]" style={{ border: '1px solid #000000' }}>प्रोग्रेसिव्ह लाभार्थी</th>
                <th className="border border-black p-1.5 min-w-[50px]" style={{ border: '1px solid #000000' }}>हिस्सा</th>
                <th className="border border-black p-1.5 min-w-[45px]" style={{ border: '1px solid #000000' }}>दर</th>
                <th className="border border-black p-1.5 min-w-[110px]" style={{ border: '1px solid #000000' }}>इंधन भाजीपाला देय अनुदान</th>
                <th className="border border-black p-1.5 min-w-[140px]" style={{ border: '1px solid #000000' }}>स्वयंपाकी तथा मदतनीस संख्या</th>
                <th className="border border-black p-1.5 min-w-[140px]" style={{ border: '1px solid #000000' }}>स्वयंपाकी तथा मदतनीस मानधन</th>
                <th className="border border-black p-1.5 min-w-[65px]" style={{ border: '1px solid #000000' }}>शेरा</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: 1 To 5 */}
              {showPrimary && (
                <>
                  <tr>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>१ ते ५</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>{certPatPrimary || toMarathiNumbers(primaryEnrolled.toString())}</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>{certPrimaryCookedDays || toMarathiNumbers(primaryCookedDays.toString())}</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>{certBeneficiaryPrimary || toMarathiNumbers(primaryBeneficiarySum.toString())}</td>
                    <td className="border border-black p-1 font-medium" style={{ border: '1px solid #000000' }}>केंद्र</td>
                    <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(primaryKendraShare)}</td>
                    <td className="border border-black p-1 font-semibold" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(primaryCenterGrant.toFixed(2))}</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={showUpper ? 4 : 2}>
                      {renderCountInputs()}
                    </td>
                    <td className="border border-black p-1 font-semibold text-slate-900" style={{ border: '1px solid #000000' }}>
                      स्वयंपाकी - ₹{toMarathiNumbers(cookHonorarium.toString())}
                    </td>
                    <td className="border border-black p-1 font-bold text-emerald-700" style={{ border: '1px solid #000000' }} rowSpan={2}>अचूक नोंदवलेले</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 font-medium" style={{ border: '1px solid #000000' }}>राज्य</td>
                    <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(primaryRajyaShare)}</td>
                    <td className="border border-black p-1 font-semibold" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(primaryStateGrant.toFixed(2))}</td>
                    <td className="border border-black p-1 font-semibold text-slate-900" style={{ border: '1px solid #000000' }}>
                      मदतनीस - ₹{toMarathiNumbers(helperHonorarium.toString())}
                    </td>
                  </tr>
                </>
              )}

              {/* Row 2: 6 To 8 */}
              {showUpper && (
                <>
                  <tr>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>६ ते ८</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>{certPatUpper || toMarathiNumbers(upperEnrolled.toString())}</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>{certUpperCookedDays || toMarathiNumbers(upperCookedDays.toString())}</td>
                    <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>{certBeneficiaryUpper || toMarathiNumbers(upperBeneficiarySum.toString())}</td>
                    <td className="border border-black p-1 font-medium" style={{ border: '1px solid #000000' }}>केंद्र</td>
                    <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(upperKendraShare)}</td>
                    <td className="border border-black p-1 font-semibold" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(upperCenterGrant.toFixed(2))}</td>
                    {!showPrimary && (
                      <td className="border border-black p-1 font-bold" style={{ border: '1px solid #000000' }} rowSpan={2}>
                        {renderCountInputs()}
                      </td>
                    )}
                    <td className="border border-black p-1 font-semibold text-slate-900" style={{ border: '1px solid #000000' }}>
                      स्वयंपाकी - ₹{toMarathiNumbers(cookHonorarium.toString())}
                    </td>
                    <td className="border border-black p-1 font-bold text-emerald-700" style={{ border: '1px solid #000000' }} rowSpan={2}>अचूक नोंदवलेले</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 font-medium" style={{ border: '1px solid #000000' }}>राज्य</td>
                    <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(upperRajyaShare)}</td>
                    <td className="border border-black p-1 font-semibold" style={{ border: '1px solid #000000' }}>{toMarathiNumbers(upperStateGrant.toFixed(2))}</td>
                    <td className="border border-black p-1 font-semibold text-slate-900" style={{ border: '1px solid #000000' }}>
                      मदतनीस - ₹{toMarathiNumbers(helperHonorarium.toString())}
                    </td>
                  </tr>
                </>
              )}

              {/* Row 3: Total */}
              <tr className="bg-slate-50 font-bold">
                <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>एकूण</td>
                <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>
                  {subTab === "1-5"
                    ? (certPatPrimary || toMarathiNumbers(primaryEnrolled.toString()))
                    : subTab === "6-8"
                    ? (certPatUpper || toMarathiNumbers(upperEnrolled.toString()))
                    : toMarathiNumbers(((parseInt(toEnglishNumbers(certPatPrimary)) || primaryEnrolled) + (parseInt(toEnglishNumbers(certPatUpper)) || upperEnrolled)).toString())}
                </td>
                <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>
                  {subTab === "1-5"
                    ? (certPrimaryCookedDays || toMarathiNumbers(primaryCookedDays.toString()))
                    : subTab === "6-8"
                    ? (certUpperCookedDays || toMarathiNumbers(upperCookedDays.toString()))
                    : toMarathiNumbers((primaryCookedDays + upperCookedDays).toString())}
                </td>
                <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>
                  {subTab === "1-5"
                    ? (certBeneficiaryPrimary || toMarathiNumbers(primaryBeneficiarySum.toString()))
                    : subTab === "6-8"
                    ? (certBeneficiaryUpper || toMarathiNumbers(upperBeneficiarySum.toString()))
                    : toMarathiNumbers(
                        (
                          (certBeneficiaryPrimary ? parseInt(toEnglishNumbers(certBeneficiaryPrimary), 10) || primaryBeneficiarySum : primaryBeneficiarySum) +
                          (certBeneficiaryUpper ? parseInt(toEnglishNumbers(certBeneficiaryUpper), 10) || upperBeneficiarySum : upperBeneficiarySum)
                        ).toString()
                      )}
                </td>
                <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>---</td>
                <td className="border border-black p-1" style={{ border: '1px solid #000000' }}>---</td>
                <td className="border border-black p-1 text-emerald-800" style={{ border: '1px solid #000000' }}>
                  {toMarathiNumbers(currentTotalGrant.toFixed(2))}
                </td>
                <td className="border border-black p-1 text-xs font-black" style={{ border: '1px solid #000000' }}>
                  स्वयंपाकी: {toMarathiNumbers(cookNum.toString())}, मदतनीस: {toMarathiNumbers(helperNum.toString())}
                </td>
                <td className="border border-black p-1 text-emerald-800 font-extrabold" style={{ border: '1px solid #000000' }}>
                  ₹{toMarathiNumbers(totalHonorarium.toString())}
                </td>
                <td className="border border-black p-1 text-blue-700" style={{ border: '1px solid #000000' }}>प्रमाणित</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vegetable Usage Sub-table (भाजीपाला वापर तक्ता) */}
        <div className="mt-4 flex justify-start">
          <table className="border-collapse border border-black text-center text-xs font-sans" style={{ borderCollapse: 'collapse', border: '1px solid #000000' }}>
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-black text-xs">
                <th className="border border-black px-8 py-1 min-w-[120px]" style={{ border: '1px solid #000000' }}>तपशील</th>
                <th className="border border-black px-8 py-1 min-w-[160px]" style={{ border: '1px solid #000000' }} colSpan={2}>वापर</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-8 py-1 font-bold" style={{ border: '1px solid #000000' }}>भाजीपाला</td>
                <td className="border border-black px-8 py-1 font-bold" style={{ border: '1px solid #000000' }}>{toMarathiNumbers((vegUsageKg !== undefined ? vegUsageKg : subTab === "1-5" ? primaryBeneficiarySum * 0.050 : subTab === "6-8" ? upperBeneficiarySum * 0.075 : (primaryBeneficiarySum * 0.050) + (upperBeneficiarySum * 0.075)).toFixed(3))}</td>
                <td className="border border-black px-4 py-1 font-medium" style={{ border: '1px solid #000000' }}>कि. ग्रॅ.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Signatures */}
      <div className="flex justify-between items-end mt-12 px-6 text-xs font-bold text-black select-none">
        <div className="space-y-4 text-xs font-bold">
          <div>स्थळ --------------------</div>
          <div>दि. --------------------</div>
        </div>
        <div className="text-center pb-2 text-xs font-bold">
          <p>मुख्याध्यापक तथा सचिव</p>
        </div>
        <div className="text-center pb-2 text-xs font-bold">
          <p>अध्यक्ष</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default MDMCertificate;
