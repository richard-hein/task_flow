import UserModel from "../../database/models/user.model.js";
export class UserService {
    async findUserById(userId) {
        const user = await UserModel.findById(userId, { password: false });
        return user || null;
    }
}
