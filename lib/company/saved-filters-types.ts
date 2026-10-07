import type {PipelineFilters} from "./pipeline-filters";
export type SavedApplicantFilter={id:string;name:string;filters:PipelineFilters;archivedAt:string|null};
export type SavedFilterResponse={items:SavedApplicantFilter[];revision:string};
