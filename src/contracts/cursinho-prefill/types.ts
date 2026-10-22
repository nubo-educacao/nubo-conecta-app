// NUB-RD-99a. Frozen consumer types for urn:nubo:sprint9.2:contract:1.0.0-rc.2.
// No lookup, component state, persistence or runtime authorization is introduced here.
export const CONTRACT_VERSION = '1.0.0-rc.2' as const;
export type Tier = 'T1' | 'T2';
export type EffectiveTiers = [] | ['T1'] | ['T1','T2'];
export type Gender = 'mulher_cis' | 'homem_cis' | 'pessoa_nao_binaria' | 'mulher_transgenero' | 'homem_transgenero' | 'prefiro_nao_declarar';
export interface FieldValues {
 full_name: string;
 social_name: string;
 birth_date: string;
 education: 'Ensino Fundamental' | 'Ensino Médio Incompleto' | 'Ensino Médio Completo' | 'Ensino Superior Incompleto' | 'Ensino Superior Completo' | 'Pós-Gradução';
 school_type: 'Escola pública' | 'Escola particular sem bolsa';
 cpf: string;
 race: 'Parda' | 'Branca' | 'Preta' | 'Amarela' | 'Indígena' | 'Prefiro não informar';
 gender: Gender;
 family_count: number;
}
export type Field = keyof FieldValues;
export type ManualFieldValues=Omit<FieldValues,'school_type'> & {school_type:FieldValues['school_type']|'Escola particular com bolsa 100%'|'Escola particular com bolsa parcial'};
type FieldTier<F extends Field> = F extends 'cpf'|'race'|'gender'|'family_count' ? 'T2' : 'T1';
export interface OriginProof {
 token: string; checked_at: string; partial: boolean; issued_at: string; expires_at: string;
}
export type Candidate = { [F in Field]: {
 field:F; tier:FieldTier<F>; value:FieldValues[F]; partial:boolean; candidate_id:string;
 source:'cursinho_nubo'; checked_at:string; rule_version:string; offer_version:string; origin_proof:OriginProof;
}}[Field];
export type FieldDecision = { [F in Field]:
 | {field:F;offer_version:string;decision:'accepted';value:FieldValues[F];candidate_id:string;origin_proof:OriginProof}
 | {field:F;offer_version:string;decision:'rejected';candidate_id?:string|null;value?:never;origin_proof?:never}
 | {field:F;offer_version:string;decision:'user_declared';value:ManualFieldValues[F];candidate_id?:never;origin_proof?:never}
}[Field];
export interface CommitRequest { commit_id:string;expected_profile_revision:number;operation_id:string|null;decisions:FieldDecision[]; }
export interface CommitReceipt {commit_id:string;profile_revision:number;committed_at:string;accepted_fields:Field[];rejected_fields:Field[];}
export type ConsentRequest = {
 purpose:'cursinho_prefill';text_version:string;policy_version:string;expected_consent_revision:number;
} & (
 | {action:'grant';requested_tiers:['T1']|['T1','T2']}
 | {action:'decline'|'revoke';requested_tiers:[]}
);
export interface ConsentReceipt {
 event_id:string;consent_revision:number;purpose:'cursinho_prefill';effective_tiers:EffectiveTiers;text_version:string;policy_version:string;recorded_at:string;
}
export type SelfRequest = Record<string,never>;
export type SelfSituation = 'aluno'|'ex_aluno'|'em_processo'|'aprovado_sem_matricula'|'nao_aprovado'|'indeterminada';
interface EventBase {contract_version:typeof CONTRACT_VERSION;operation_id:string;}
export type PrefillEvent = EventBase & (
 | {event:'checking';seq:0}
 | {event:'matched';seq:1;cursinho_situation:SelfSituation}
 | {event:'ready';seq:2;verified_adult:boolean;candidates:Candidate[]}
 | {event:'manual_required';seq:0|1|2;reason:'consent_required'|'manual_entry'}
);


export type OfficialSituation='aluno'|'ex_aluno'|'processo_seletivo'|'aprovado_sem_matricula'|'rejeitado'|'indeterminada';
type OfficialPair=
 | {official_situation:'aluno'|'ex_aluno';compatible_is_nubo_student:true}
 | {official_situation:'processo_seletivo'|'aprovado_sem_matricula'|'rejeitado';compatible_is_nubo_student:false}
 | {official_situation:'indeterminada';compatible_is_nubo_student:null};
interface AdminBase {
 contract_version:typeof CONTRACT_VERSION;source_label:'Cursinho Nubo';rule_version:string;
 last_attempt_at:string|null;last_success_at:string|null;freshness:'fresh'|'stale'|'unknown';
 last_success_summary:(OfficialPair & {checked_at:string;evidence_version:string;rule_version:string})|null;
}
export type AdminProjection=AdminBase & (
 | (OfficialPair & {resolution_state:'unique';checked_at:string;evidence_version:string;reason:null})
 | {resolution_state:'not_found'|'ambiguous'|'invalid_phone'|'not_checked'|'error';official_situation:null;compatible_is_nubo_student:null;checked_at:string|null;evidence_version:string|null;reason:null}
 | {resolution_state:'not_checked';official_situation:null;compatible_is_nubo_student:null;checked_at:string|null;evidence_version:string|null;reason:'phone_changed'}
);
