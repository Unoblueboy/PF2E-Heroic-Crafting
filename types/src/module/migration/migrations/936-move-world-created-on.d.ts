import { MigrationBase } from '../base.ts';
/** Move stored World Clock setting to new location */
export declare class Migration936MoveWorldClockSettings extends MigrationBase {
    static version: number;
    migrate(): Promise<void>;
}
