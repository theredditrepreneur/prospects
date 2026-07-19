"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({idle,pending}:{idle:string;pending:string}){const{pending:isPending}=useFormStatus();return <button className="button min-w-32" type="submit" disabled={isPending} aria-disabled={isPending}>{isPending?pending:idle}</button>}
