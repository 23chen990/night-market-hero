import {z} from 'zod';
export {TaskSchema,ReviewSchema} from '../../sky-street-v2/qa/review-contract.mjs';
const Ref=z.object({path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export const InventorySchema=z.object({targetGame:z.literal('夜市飞侠：护印突围'),workspace:z.string(),assets:z.array(z.object({id:z.string(),label:z.string(),role:z.string(),file:Ref,approvalStatus:z.enum(['APPROVED','USER_AUTHORIZED_PREVIEW','PENDING','REJECTED','UNKNOWN']),approvalEvidence:z.array(z.string()),usedInV2:z.boolean(),recommendedUse:z.string()}).strict()),styleAuthority:Ref,excluded:z.array(z.object({path:z.string(),reason:z.string()}).strict()),findings:z.array(z.string())}).strict();
