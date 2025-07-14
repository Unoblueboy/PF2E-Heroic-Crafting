import { ProgressNotification } from '../../../types/foundry/client/applications/ui/notifications.d.mts';
/**
 * An alternative API for Notification loading bars
 * @category Other
 */
declare class Progress {
    value: number;
    readonly max: number;
    label: string;
    notification: ProgressNotification;
    constructor({ max, label }: {
        max: number;
        label?: string;
    });
    advance({ by, label }?: {
        by?: number;
        label?: string;
    }): void;
    close({ label }?: {
        label?: string | undefined;
    }): void;
}
export { Progress };
