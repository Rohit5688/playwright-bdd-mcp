import { sanitizeOutput, auditGeneratedCode } from './src/utils/SecurityUtils.js';

const output = `
  API_KEY=12345secret
  password: "my_super_secret"
  Authorization: Bearer my.jwt.token
`;
console.log("CLEAN OUTPUT:", sanitizeOutput(output));

const files = [
  { path: 'pages/Login.ts', content: 'const p = "password: \\"supersecret123\\"";' },
  { path: 'pages/Api.ts', content: 'const req = { Authorization: "Bearer my-token-12345-long" };' },
  { path: 'pages/Safe.ts', content: 'const p = process.env.PASSWORD;' }
];
console.log("VIOLATIONS:", auditGeneratedCode(files));
