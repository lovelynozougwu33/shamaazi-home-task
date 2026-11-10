import { Donation } from './Donation';
import { Donor } from './Donor';
import { Product } from './Product';
import { RecurringSchedule } from './RecurringSchedule';

Donor.hasMany(Donation, { foreignKey: 'donorId' });
Donation.belongsTo(Donor, { foreignKey: 'donorId' });

Product.hasMany(Donation, { foreignKey: 'productId' });
Donation.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

Donor.hasMany(RecurringSchedule, { foreignKey: 'donorId' });
RecurringSchedule.belongsTo(Donor, { foreignKey: 'donorId' });

Product.hasMany(RecurringSchedule, { foreignKey: 'productId' });
RecurringSchedule.belongsTo(Product, { foreignKey: 'productId' });

RecurringSchedule.hasMany(Donation, { foreignKey: 'recurringScheduleId' });
Donation.belongsTo(RecurringSchedule, { foreignKey: 'recurringScheduleId' });

export { Donation, Donor, Product, RecurringSchedule };
export type { DonationStatus, DonationType } from './Donation';
export type { RecurringFrequency } from './RecurringSchedule';
