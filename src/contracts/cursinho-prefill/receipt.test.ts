import { describe,it,expect,expectTypeOf } from 'vitest';
import { CONTRACT_VERSION,type CommitRequest,type ConsentRequest,type FieldDecision,type PrefillEvent,type SelfRequest } from './types';
import schema from './schema.rc2.json';
import fixtures from './fixtures.rc2.json';
describe('99a frozen consumer receipt',()=>{
 it('pins schema and fixtures to the approved RC2',()=>{
  expect(CONTRACT_VERSION).toBe('1.0.0-rc.2');
  expect(fixtures.contract_version).toBe(CONTRACT_VERSION);
  expect(schema.$id).toContain('1.0.0-rc.2');
  expect(fixtures.synthetic).toBe(true);
 });
 it('represents manual and rejected values without external certification',()=>{
  const decisions:FieldDecision[]=[
   {field:'full_name',value:'Pessoa Sintética',decision:'user_declared',offer_version:'manual-v1'},
   {field:'family_count',value:3,decision:'user_declared',offer_version:'manual-v1'},
   {field:'cpf',decision:'rejected',offer_version:'offer-v1'}
  ];
  expectTypeOf({commit_id:'fixture-commit',expected_profile_revision:0,operation_id:null,decisions}).toMatchTypeOf<CommitRequest>();
 });
 it('represents separate T1/T2 actions and decline/revoke with no tiers',()=>{
  const t1:ConsentRequest={action:'grant',purpose:'cursinho_prefill',requested_tiers:['T1'],text_version:'fixture-text',policy_version:'fixture-policy',expected_consent_revision:0};
  expect(t1.requested_tiers).toEqual(['T1']);
  expectTypeOf({...t1,action:'revoke' as const,requested_tiers:[] as []}).toMatchTypeOf<ConsentRequest>();
 });
 it('has an empty self request and provisional matched event',()=>{
  expectTypeOf({}).toMatchTypeOf<SelfRequest>();
  const event:PrefillEvent={contract_version:CONTRACT_VERSION,operation_id:'fixture-op',event:'matched',seq:1,cursinho_situation:'nao_aprovado'};
  expect(event.event).toBe('matched');
 });
});
// Negative compile-time contract assertions; executed runtime validation belongs to 99b/99f.
// @ts-expect-error Rejected suggestions must never carry their rejected values.
const rejectedValue:FieldDecision={field:'cpf',decision:'rejected',offer_version:'v1',value:'000.000.000-00'};
// @ts-expect-error Edited suggestion is user declaration, without a source proof.
const editedProof:FieldDecision={field:'full_name',decision:'user_declared',offer_version:'v1',value:'Pessoa',candidate_id:'c1'};
// @ts-expect-error Decline cannot authorize T1.
const declinedT1:ConsentRequest={action:'decline',purpose:'cursinho_prefill',requested_tiers:['T1'],text_version:'t',policy_version:'p',expected_consent_revision:0};
// @ts-expect-error Session identity is server-derived.
const spoofSelf:SelfRequest={user_id:'other'};
void [rejectedValue,editedProof,declinedT1,spoofSelf];


it('D99-R1 includes Outra only in manual race declarations',()=>{
 const declaration={field:'race' as const,value:'Outra' as const,decision:'user_declared' as const,offer_version:'manual-v1'};
 expectTypeOf(declaration).toMatchTypeOf<FieldDecision>();
 expect(declaration.value).toBe('Outra');
 const raceSchema=schema.$defs.candidate.oneOf.find(candidate=>candidate.properties.field.const==='race');
 expect(raceSchema?.properties.value.enum).toEqual(['Parda','Branca','Preta','Amarela','Indígena','Prefiro não informar']);
 type CandidateRace=Extract<import('./types').Candidate,{field:'race'}>['value'];
 type AcceptedRace=Extract<FieldDecision,{field:'race';decision:'accepted'}>['value'];
 expectTypeOf<'Outra'>().not.toMatchTypeOf<CandidateRace>();
 expectTypeOf<'Outra'>().not.toMatchTypeOf<AcceptedRace>();
 type ManualRace=Extract<FieldDecision,{field:'race';decision:'user_declared'}>['value'];
 expectTypeOf<'Desconhecida'>().not.toMatchTypeOf<ManualRace>();
});
