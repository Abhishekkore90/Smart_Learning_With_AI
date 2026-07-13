const fs = require("fs");
const file =
  "e:\\\\eduction\\\\pure-pixel-showcase-main\\\\src\\\\routes\\\\admin.ai-tools.tsx";
let code = fs.readFileSync(file, "utf8");

const replacements = [
  ["bg-[#0d0d0d]", "bg-slate-50 dark:bg-[#0d0d0d]"],
  ["bg-[#171717]", "bg-white dark:bg-[#171717]"],
  ["bg-[#212121]", "bg-slate-100 dark:bg-[#212121]"],
  ["bg-[#2c2c2c]", "bg-slate-200 dark:bg-[#2c2c2c]"],
  ["text-[#ececec]", "text-slate-900 dark:text-[#ececec]"],
  ["text-[#9b9b9b]", "text-slate-500 dark:text-[#9b9b9b]"],
  ["text-[#c5c5c5]", "text-slate-700 dark:text-[#c5c5c5]"],
  ["text-stone-400", "text-slate-600 dark:text-stone-400"],
  ["text-stone-500", "text-slate-500 dark:text-stone-500"],
  ["text-stone-600", "text-slate-400 dark:text-stone-600"],
  ["border-white/5", "border-slate-200 dark:border-white/5"],
  ["border-white/10", "border-slate-300 dark:border-white/10"],
  ["hover:bg-white/5", "hover:bg-slate-100 dark:hover:bg-white/5"],
  ["hover:bg-[#212121]", "hover:bg-slate-100 dark:hover:bg-[#212121]"],
  ["hover:bg-[#3e3e3e]", "hover:bg-slate-200 dark:hover:bg-[#3e3e3e]"],
  ["hover:bg-white/10", "hover:bg-slate-200 dark:hover:bg-white/10"],
  ["hover:text-white", "hover:text-slate-900 dark:hover:text-white"],
  ["bg-white/5", "bg-slate-100 dark:bg-white/5"],
  ["bg-[#0d0d0d]/80", "bg-slate-50/80 dark:bg-[#0d0d0d]/80"],
  ["text-white/90", "text-slate-900 dark:text-white/90"],
];

for (const [find, replace] of replacements) {
  code = code.split(find).join(replace);
}

// Add state
if (!code.includes("const [isDark, setIsDark] = useState(true)")) {
  code = code.replace(
    "const [isAdmin, setIsAdmin] = useState(false);",
    "const [isAdmin, setIsAdmin] = useState(false);\\n  const [isDark, setIsDark] = useState(true);",
  );
}

// Wrap the main div
if (!code.includes("isDark ? \\'dark\\' : \\'\\'")) {
  code = code.replace(
    '<div className="h-screen w-full flex bg-slate-50 dark:bg-[#0d0d0d] text-slate-900 dark:text-[#ececec] font-sans overflow-hidden select-none">',
    "<div className={`h-screen w-full flex ${isDark ? \\'dark\\' : \\'\\'}`}>\\n      <div className=\"h-full w-full flex bg-slate-50 dark:bg-[#0d0d0d] text-slate-900 dark:text-[#ececec] font-sans overflow-hidden select-none\">",
  );
  code = code.replace(
    "    </div>\\n  );\\n}",
    "      </div>\\n    </div>\\n  );\\n}",
  );
}

// Add button
if (!code.includes("setIsDark(!isDark)")) {
  code = code.replace(
    '<div className="flex items-center gap-3">',
    '<div className="flex items-center gap-3">\\n            <button onClick={() => setIsDark(!isDark)} className="size-8 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-stone-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">\\n              {isDark ? <Zap className="size-4" /> : <Settings className="size-4" />}\\n            </button>',
  );
}

fs.writeFileSync(file, code);
console.log("Success");
