"use client";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    birthdate: "",
    mobile: "",
    address: "",
    beneficiary_name: "",
    beneficiary_relation: "",
    include_mas: true,
  });

  const router = useRouter();
  const supabase = createClient();

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalFee = 200 + 100 + (form.include_mas ? 740 : 0);

  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // STEP 1: VALIDATION
      if (form.password !== form.confirm_password) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      if (!form.first_name || !form.last_name) {
        setError("First name and last name are required.");
        setLoading(false);
        return;
      }

      if (!form.email || !form.password) {
        setError("Email and password are required.");
        setLoading(false);
        return;
      }

      // STEP 2: CHECK IF MEMBER EXISTS FIRST
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      if (existing) {
        setError("You are already registered.");
        setLoading(false);
        return;
      }

      // STEP 3: CREATE AUTH USER
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email,
          password: form.password,
        });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;

      if (!userId) {
        setError("Something went wrong creating account.");
        setLoading(false);
        return;
      }

      // STEP 4: INSERT MEMBER
      const { error: memberError } = await supabase.from("members").insert({
        user_id: userId,
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        birthdate: form.birthdate || null,
        mobile: form.mobile,
        contact_number: form.mobile,
        email: form.email,
        address: form.address,
        beneficiary_name: form.beneficiary_name,
        beneficiary_relation: form.beneficiary_relation,
        status: "non-active",
        approval_status: "pending",
        date_joined: new Date().toISOString().split("T")[0],
      });

      if (memberError) {
        console.error("MEMBER INSERT ERROR:", memberError);
        setError("Something went wrong while saving your data.");
        setLoading(false);
        return;
      }

      // STEP 5: INSERT ROLE
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "member",
        });

      if (roleError) {
        console.error(roleError);
        setError("Account created but role assignment failed.");
        setLoading(false);
        return;
      }

      // STEP 6: SUCCESS
      setStep(4);
      setLoading(false);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unexpected error occurred.");
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.8rem 1rem",
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(212,160,23,0.2)",
    borderRadius: 6,
    color: "white",
    fontSize: "0.9rem",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "rgba(255,255,255,0.6)",
    marginBottom: "0.4rem",
  };

  const fieldGroup = (
    label: string,
    field: string,
    type = "text",
    placeholder = ""
  ) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={(form as any)[field]}
        onChange={(e) => update(field, e.target.value)}
        style={inputStyle}
      />
    </div>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--green-dk)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "var(--gold-lt)" }}>Join SUNCO</h1>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 12,
            padding: "2rem",
          }}
        >
          {step === 1 && (
            <div>
              {fieldGroup("Email", "email", "email")}
              {fieldGroup("Password", "password", "password")}
              {fieldGroup(
                "Confirm Password",
                "confirm_password",
                "password"
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              {fieldGroup("First Name", "first_name")}
              {fieldGroup("Last Name", "last_name")}
              {fieldGroup("Middle Name", "middle_name")}
              {fieldGroup("Birthdate", "birthdate", "date")}
              {fieldGroup("Mobile", "mobile")}
              {fieldGroup("Address", "address")}
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ color: "white" }}>Review your info then submit.</p>
              <p style={{ color: "rgba(255,255,255,0.5)" }}>
                Total: ₱{totalFee}
              </p>
            </div>
          )}

          {error && (
            <div style={{ color: "red", marginTop: 10 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}>Back</button>
            )}

            {step < 3 ? (
              <button onClick={() => setStep(step + 1)}>Next</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>

          {step === 4 && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <h2>Application Submitted</h2>
              <p>Pending approval</p>
              <a href="/login">Go to Login</a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}