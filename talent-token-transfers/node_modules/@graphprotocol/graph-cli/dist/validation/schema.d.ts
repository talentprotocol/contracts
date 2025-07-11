import immutable from 'immutable';
/**
 * Returns a GraphQL type suggestion for a given input type.
 * Returns `undefined` if no suggestion is available for the type.
 */
export declare const typeSuggestion: (typeName: string) => string | RegExp;
export declare const validateSchema: (filename: string) => immutable.List<any>;
