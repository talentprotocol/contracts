import { GluegunPrint } from 'gluegun';
export type Spinner = ReturnType<GluegunPrint['spin']>;
export declare const step: (spinner: Spinner, subject: string, text?: string) => Spinner;
export declare const withSpinner: (text: string, errorText: string, warningText: string, f: (spinner: Spinner) => Promise<any> | any) => Promise<any>;
