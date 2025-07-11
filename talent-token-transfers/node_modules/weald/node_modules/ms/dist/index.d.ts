declare type Unit = 'Years' | 'Year' | 'Yrs' | 'Yr' | 'Y' | 'Weeks' | 'Week' | 'W' | 'Days' | 'Day' | 'D' | 'Hours' | 'Hour' | 'Hrs' | 'Hr' | 'H' | 'Minutes' | 'Minute' | 'Mins' | 'Min' | 'M' | 'Seconds' | 'Second' | 'Secs' | 'Sec' | 's' | 'Milliseconds' | 'Millisecond' | 'Msecs' | 'Msec' | 'Ms';
declare type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;
export declare type StringValue = `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`;
interface Options {
    /**
     * Set to `true` to use verbose formatting. Defaults to `false`.
     */
    long?: boolean;
}
/**
 * Parse or format the given `val`.
 *
 * @param value - The string or number to convert
 * @param options - Options for the conversion
 * @throws Error if `value` is not a non-empty string or a number
 */
declare function ms(value: StringValue, options?: Options): number;
declare function ms(value: number, options?: Options): string;
export default ms;
