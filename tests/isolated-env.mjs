process.env.VANTORY_UNIT_TESTS="1";
process.env.NODE_ENV="test";
process.env.MONGODB_URI="mongodb://127.0.0.1:1/vantory_unit_tests?serverSelectionTimeoutMS=50";
process.env.JWT_SECRET="isolated-unit-test-secret-never-use-in-production-000";
for(const key of ["SMTP_HOST","SMTP_USER","SMTP_PASS","SUPPORT_RECIPIENT_EMAIL","GEMINI_API_KEY","JUDGE0_URL","JUDGE0_TOKEN","CRON_SECRET"]) process.env[key]="";
globalThis.fetch=async()=>{throw new Error("Network is disabled in unit tests. Mock the transport explicitly.");};
