import test from "node:test";
import assert from "node:assert/strict";
import {parseCsv,parseStudentCsv} from "../lib/institute/student-csv";
test("CSV preserves quoted commas, escaped quotes, multiline fields, BOM and reordered headers",()=>{
 const rows=parseStudentCsv('\uFEFFemail,fullName,department,graduationYear\r\nqa@example.invalid,"QA Candidate, Example","Computer ""Science""\nDepartment",\r\n');
 assert.equal(rows[0].name,"QA Candidate, Example");assert.equal(rows[0].department,'Computer "Science"\nDepartment');assert.equal(rows[0].status,"VALID");assert.equal(rows[0].graduationYear,undefined);
 assert.equal(rows[0].studentId,"");assert.equal(rows[0].course,"");
});
test("CSV rejects malformed quoting and headers rather than producing invitations",()=>{
 assert.throws(()=>parseCsv('name,email\n"broken,qa@example.invalid'),/unclosed/);
 assert.throws(()=>parseStudentCsv('name,email,email\na,b,c'),/duplicate/);
 assert.throws(()=>parseStudentCsv('name,department\na,b'),/fullName and email/);
});
test("CSV exposes column errors, invalid years and duplicate email rows",()=>{
 const rows=parseStudentCsv('fullName,email,graduationYear\nName,qa@example.invalid,2027\nOther,QA@example.invalid,2027\nBad,bad@example.invalid,2027x\nShort,short@example.invalid\nBlank,blank@example.invalid,');
 assert.deepEqual(rows.map(r=>r.status),["VALID","DUPLICATE","INVALID","INVALID","VALID"]);
 assert.match(rows[2].reason!,/Graduation year/);assert.match(rows[3].reason!,/expected 3 columns/);
});
