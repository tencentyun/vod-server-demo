import { Entity, Column, Generated, PrimaryGeneratedColumn } from "typeorm";

/*
 * 用户第三方平台授权表(UserAuth)
 * 更多 typeorm 用法请参考：https://typeorm.io/#/
 */
@Entity("UserAuth")
export class UserAuth {
    @PrimaryGeneratedColumn({
        name: "id",
    })
    @Generated("uuid")
    Id?: string;

    @Column({
        name: "user_id",
    })
    UserId: string;

    @Column({
        name: "type",
    })
    Type: string;

    @Column({
        name: "auth_info",
    })
    AuthInfo: string;

    constructor(userId: string, type: string, authInfo: string) {
        this.UserId = userId;
        this.Type = type;
        this.AuthInfo = authInfo;
    }
}
