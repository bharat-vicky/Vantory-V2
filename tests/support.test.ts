import test from "node:test";
import assert from "node:assert/strict";
import {sendContactEmail} from "../lib/email/mailer";
import {POST} from "../app/api/support/contact/route";
import {db} from "../lib/db";
import {stubMethod} from "./fixtures";
test("Missing SMTP does not claim email delivery",async()=>{const r=await sendContactEmail({name:"Test",email:"test@example.com",message:"fixture"});assert.equal(r.success,false);assert.equal(r.isRealSmtp,false);});
test("Support success requires a persisted ticket, independently of email",async()=>{let persisted=false;const restore=stubMethod(db.supportTicket,"create",async()=>{persisted=true;return {id:"ticket-fixture",deliveryStatus:"PENDING"};});try{const r=await POST(new Request("http://localhost/api/support/contact",{method:"POST",body:JSON.stringify({name:"Test",email:"support-fixture@example.com",message:"Need help with a saved resume"})}));const j=await r.json();assert.equal(r.status,201);assert.equal(persisted,true);assert.equal(j.ticketId,"ticket-fixture");assert.equal(j.deliveryStatus,"PENDING");assert.equal(j.isRealSmtp,undefined);}finally{restore();}});
test("Invalid support input cannot create a ticket",async()=>{const r=await POST(new Request("http://localhost/api/support/contact",{method:"POST",body:JSON.stringify({name:"T",email:"invalid",message:"x"})}));assert.equal(r.status,400);});
