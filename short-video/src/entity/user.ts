import {
    Entity,
    Column,
    Generated,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

/*
 * 用户表(User)
 * 更多 typeorm 用法请参考：https://typeorm.io/#/
 */
@Entity("User")
export class User {
    @PrimaryGeneratedColumn({
        name: "id"
    })
    @Generated("uuid")
    Id?: string;

    @Column({
        name: "password"
    })
    Password: string;

    @Column({
        name: "nickname"
    })
    NickName: string;

    @CreateDateColumn({
        name: "create_time"
    })
    CreateTime?: Date;

    @UpdateDateColumn({
        name: "update_time"
    })
    UpdateTime?: Date;

    @Column({
        name: "sys_avatar_id"
    })
    Avatar?: string;

    @Column({
        name: "custom_avatar_url"
    })
    CustomAvatarUrl?: string;

    @Column({
        name: "description"
    })
    Description?: string;

    constructor(nickname: string, password: string) {
        this.NickName = nickname;
        this.Password = password;
    }
}
