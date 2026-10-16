import fs from 'node:fs';

// Generate a valid minimal PDF 1.4 document containing selectable text
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 420 >>
stream
BT
/F1 12 Tf
72 712 Td
(ALEX MERCER) Tj
0 -20 Td
(alex.mercer@testmail.com | Seattle, WA) Tj
0 -30 Td
(PROFESSIONAL SUMMARY) Tj
0 -15 Td
(Senior Cloud Backend Engineer with 5 years experience in Node.js and TypeScript.) Tj
0 -30 Td
(EXPERIENCE) Tj
0 -15 Td
(Senior Developer at Horizon Tech (2021 - Present)) Tj
0 -15 Td
(Architected Node.js APIs and managed PostgreSQL databases.) Tj
0 -15 Td
(Engineered Docker containers and deployed to AWS.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
770
%%EOF
`;

fs.writeFileSync('test_candidate.pdf', pdfContent);
console.log('test_candidate.pdf generated successfully');
