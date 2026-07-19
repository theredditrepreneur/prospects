import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { discoverProspects } from "@/inngest/functions/discover-prospects";
import { researchCompany } from "@/inngest/functions/research-company";
export const {GET,POST,PUT}=serve({client:inngest,functions:[discoverProspects,researchCompany]});
