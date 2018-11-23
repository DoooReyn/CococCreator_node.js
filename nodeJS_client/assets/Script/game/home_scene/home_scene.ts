import tab_button from "./tab_button";
import Stype from "../Stype";
import websocket from "../../modules/websocket";
import Cmd from "../Cmd";
import {user_info, bonues_info, game_info} from "../info_interface";
import Response from "../Response";
import ugame from "../ugame";
import mine_ctl from "./mine_ctl"
import game_system from "../protobufs/game_system";
import login_bonues from "./login_bonues"
import home_ctl from "./home_ctl"
import system_ctl from "./system_ctl"
import friend_ctl from "./friend_ctl"

const {ccclass, property} = cc._decorator;

@ccclass
export default class home_scene extends cc.Component {

    @property([cc.Button])
    tab_buttons: Array<cc.Button> = [];

    @property([cc.Node])
    tab_content: Array<cc.Node> = [];

    @property(mine_ctl)
    mine_ctl: mine_ctl = null;
    @property(home_ctl)
    home_ctl: home_ctl = null;
    @property(system_ctl)
    system_ctl: system_ctl = null;
    @property(friend_ctl)
    friend_ctl: friend_ctl = null;

    @property(cc.Prefab)
    login_bonues_prefab: cc.Prefab = null;

    tab_button_com_set: Array<tab_button> = [];
    // 服务列表
    service_handlers: {[key: string]: any} = {};
    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        for(let i=0; i<this.tab_buttons.length; i++) {
            let com = this.tab_buttons[i].getComponent("tab_button");
            this.tab_button_com_set.push(com);
        }

        this.service_handlers[Stype.Auth] = this.on_auth_server_return.bind(this);
        this.service_handlers[Stype.GAME_SYSTEM] = this.on_system_server_return.bind(this);
        websocket.register_services_handler(this.service_handlers);
    }
     /**
     * ---------------------------------------- 游戏系统管理 ------------------------------------
     */
    on_system_server_return(stype: number, ctype: number, body: any) {
        switch(ctype) {
            case Cmd.GameSystem.LOGIN_BONUES_INFO:
                this.on_get_login_bonues_today_return(body);
            break;
            case Cmd.GameSystem.RECV_LOGIN_BUNUES:
                this.on_recv_login_bonues_return(body);
            break;
            case Cmd.GameSystem.GET_WORLD_RANK_INFO:
                this.on_get_world_rank_info_return(body);
            break;
        }
    }
   // 
    on_get_login_bonues_today_return(body: bonues_info) {
        if(body.status != Response.OK) {
            console.log("on_get_login_bonues_today_return error status : " + body.status);
            return ;
        }
        console.log("on_get_login_bonues_today_return success !");
        
        if(body.b_has != 0) {   // 表示当前用户没有领取过奖励
            let node = cc.instantiate(this.login_bonues_prefab);
            node.parent = this.node;
            let login_bonues: login_bonues = node.getComponent("login_bonues");
            login_bonues.show_login_bonues(body.id, body.bonues, body.days);
        }
        
    }
    // 获取登录奖励成功
    on_recv_login_bonues_return(body: bonues_info) {
        if(body.status != Response.OK) {
            console.log("on_recv_login_bonues_return err:", body.status);
            return ;
        }
        console.log("on_recv_login_bonues_return success bonues : " + body.bonues);

        ugame.game_info.uchip += body.bonues;
        this.home_ctl.sync_info();
    }
    // 获取世界排行榜信息ret[0] = Response.OK;ret[1] = rank_array.length;ret[2] = rank_array;
    on_get_world_rank_info_return(body: Array<any>) {
        if(body[0] != Response.OK) {
            console.log("on_get_world_rank_info_return error status : " + status);
            return ;
        }
        console.log("on_get_world_rank_info_return success!");
        console.log(body);
        this.system_ctl.on_get_world_rank_data(body[3], body[2]);

    }
    
    /**
     * -------------------------------------------- 登录验证 -------------------------------------------------
     */
    on_auth_server_return(stype: number, ctype: number, body: any) {
        switch(ctype) {
            case Cmd.Auth.RELOGIN:
                console.log("error on_auth_server_return 游客账号已在别处登录");
            break;
            case Cmd.Auth.EDIT_PROFILE:
                this.on_edit_profile_server_return(body);
            break;
            case Cmd.Auth.GUEST_UPGRADE_INDENTIFY:
                this.on_get_upgrade_indentify_return(body);
            break;
            case Cmd.Auth.BIND_PHONE_NUM:
                this.on_guest_bind_phone_return(body);
            break;
        }
    }

    // 修改资料成功
    on_edit_profile_server_return(body: user_info) {
        if(body.status != Response.OK) {
            console.log("edit_profile error");
            return ;
        }
        ugame.edit_profile_success(body.unick, body.usex);
        this.mine_ctl.go_back();

        // 同步信息
        this.mine_ctl.sync_info();
        this.home_ctl.sync_info();
        this.system_ctl.sync_info();
        this.friend_ctl.sync_info();
    }
    // 游客升级成功
    on_get_upgrade_indentify_return(body: any) {
        if(body != Response.OK) {
            console.log("get upgrade_indentify error : status = " + body);
            return ;
        }
        console.log("on_get_upgrade_indentify_return sucess");
    }
    // 游客账号绑定验证码成功
    on_guest_bind_phone_return(body: any) {
        if(body != Response.OK) {
            console.log("on_guest_bind_phone_return error status: " + body);
            return ;
        }
        console.log("on_guest_bind_phone_return sucess !");
        ugame.guest_bind_phone_success();
    }
    /**
     * --------------------------------  界面 --------------
     */

    start () {
        this.on_tab_button_click(null, "0");
        this.get_login_bonues_today();
    }

    // 获取今日的登录奖励
    get_login_bonues_today() {
        game_system.get_login_bonues_today();
    }

    on_tab_button_click(e, index) {
        index = parseInt(index);
        for(let i=0; i<this.tab_buttons.length; i++) {
            if(i == index) {
                this.enable_tab(i);
            }else {
                this.disable_tab(i);
            }
        }
    }

    enable_tab(index: number) {
        this.tab_button_com_set[index].set_actived(true);
        this.tab_buttons[index].interactable = false;
        this.tab_content[index].active = true;
    }

    disable_tab(index: number) {
        this.tab_button_com_set[index].set_actived(false);
        this.tab_buttons[index].interactable = true;
        this.tab_content[index].active = false;
    }

    // update (dt) {}
}
