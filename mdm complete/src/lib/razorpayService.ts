// Helper to load Razorpay SDK dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface RazorpayPaymentOptions {
  amount: number; // in Rupees (e.g. 199)
  moduleTitle: string;
  moduleId: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherPhone?: string;
  onSuccess: (paymentId: string, orderId?: string) => void;
  onError?: (error: any) => void;
}

export const processRazorpayPayment = async (options: RazorpayPaymentOptions) => {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error("रेझरपे SDK लोड होऊ शकले नाही. इंटरनेट कनेक्शन तपासा.");
  }

  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_5y2n0qg7s8u9v0";

  const amountInPaise = Math.round(options.amount * 100);

  const rzpOptions = {
    key: razorpayKey,
    amount: amountInPaise,
    currency: "INR",
    name: "Smart Learning With AI",
    description: `${options.moduleTitle} मॉड्यूल अनलॉक`,
    image: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
    handler: function (response: any) {
      if (response && response.razorpay_payment_id) {
        options.onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
      } else {
        if (options.onError) options.onError("पेमेंट ट्रान्सॅक्शन आयडी मिळाला नाही.");
      }
    },
    prefill: {
      name: options.teacherName || "शिक्षक",
      email: options.teacherEmail || "",
      contact: options.teacherPhone || "",
    },
    notes: {
      moduleId: options.moduleId,
      moduleTitle: options.moduleTitle,
    },
    theme: {
      color: "#2563eb",
    },
  };

  const razorpayInstance = new (window as any).Razorpay(rzpOptions);
  razorpayInstance.on("payment.failed", function (response: any) {
    if (options.onError) {
      options.onError(response.error?.description || "पेमेंट अयशस्वी झाले.");
    }
  });
  razorpayInstance.open();
};
