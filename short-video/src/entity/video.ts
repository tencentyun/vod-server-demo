import {
    Entity,
    Column,
    CreateDateColumn,
    PrimaryColumn,
} from "typeorm";

/*
 * 视频表(Video)
 * 更多 typeorm 用法请参考：https://typeorm.io/#/
 */
@Entity("Video")
export class Video {
    @PrimaryColumn({
        name: "id"
    })
    Id: string;

    @Column({
        name: "title"
    })
    Title: string;

    @Column({
        name: "author"
    })
    Author: string;

    @Column({
        name: "cover"
    })
    Cover: string;

    @Column({
        name: "animated_cover"
    })
    AnimatedCover?: string;

    @CreateDateColumn({
        name: "create_time"
    })
    CreateTime?: Date;

    @Column({
        name: "status"
    })
    Status?: string;

    @Column({
        name: "url"
    })
    Url: string;

    constructor(id: string, title: string, author: string, cover: string, createTime: Date, url: string) {
        this.Id = id;
        this.Title = title;
        this.Author = author;
        this.Cover = cover;
        this.CreateTime = createTime;
        this.Url = url;
    }
}

export enum VideoStatus {
    PASS = "PASS",
    FAIL = "FAIL",
    PROCESSING = "PROCESSING",
    NOT_PASS = "NOT_PASS",
    EMPTY = ""
}
