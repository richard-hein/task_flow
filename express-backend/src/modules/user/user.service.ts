import UserModel from "../../database/models/user.model.js";

export class UserService {
  public async findUserById(userId: string) {
    const user = await UserModel.findById(userId, { password: false });
    return user || null;
  }
}
