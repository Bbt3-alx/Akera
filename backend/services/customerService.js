import { UsdCustomer } from "../models/DollarExchange.js";
import { DollarExchange } from "../models/DollarExchange.js";

export class CustomerService {
  constructor(session) {
    this.session = session;
  }

  async createCustomer(data, companyId, managerId) {
    const customer = new UsdCustomer({
      ...data,
      companies: [companyId],
      createdBy: managerId,
    });

    await customer.save({ session: this.session });
    return customer;
  }

  async updateCustomer(customerId, updateData) {
    return UsdCustomer.findByIdAndUpdate(
      customerId,
      { $set: updateData },
      { new: true, session: this.session }
    );
  }

  async softDeleteCustomer(customerId) {
    const [customer] = await Promise.all([
      UsdCustomer.findByIdAndUpdate(
        customerId,
        { deletedAt: new Date(), status: "inactive" },
        { new: true, session: this.session }
      ),
      DollarExchange.updateMany(
        { UsdCustomer: customerId },
        { status: "archived", archivedAt: new Date() },
        { session: this.session }
      ),
    ]);
    return customer;
  }
}
