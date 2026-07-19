create unique index if not exists one_intelligence_record_per_company
on public.company_intelligence(company_id);

create unique index if not exists one_pipeline_opportunity_per_company
on public.pipeline_opportunities(company_id);

