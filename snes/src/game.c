#include "game.h"
Enemy enemies[ENEMIES];
Bullet shots[SHOTS],bullets[BULLETS];
s16 px,py,bx,by,bossHp;
static u16 slowClock=0,shotClock=0,wallClock=0;
static u16 randomState=2050;

static s16 absolute(s16 n){return n<0?-n:n;}
static u16 random(void){randomState^=randomState<<7;randomState^=randomState>>9;randomState^=randomState<<8;return randomState;}
static void die(void) {if(!alive || invincible || assist)return;alive=0;playSound(1);}
static void bullet(s16 x,s16 y,s16 vx,s16 vy,u8 type) {
    u16 i;Bullet *b;for(i=0,b=bullets;i<BULLETS;i++,b++)if(!b->active){b->active=1;b->x=x;b->y=y;b->vx=vx;b->vy=vy;b->type=type;return;}
}
static void attack(Enemy *e) {
    s16 dx,dy,d,ax,ay,t;u8 a=e->attack;
    dx=(px-e->x)>>5;dy=(py-e->y)>>5;ax=absolute(dx);ay=absolute(dy);
    d=ax>ay?ax+(ay>>1):ay+(ax>>1);if(!d)d=1;
    dx=dx*30/d;dy=dy*30/d;
    if(a==0)bullet(e->x,e->y,dx,dy,e->type);
    if(a==1){bullet(e->x,e->y,-30,0,e->type);bullet(e->x,e->y,30,0,e->type);}
    if(a==1 || a==4){bullet(e->x,e->y,21,21,e->type);bullet(e->x,e->y,21,-21,e->type);bullet(e->x,e->y,-21,21,e->type);bullet(e->x,e->y,-21,-21,e->type);}
    if(a==2){bullet(e->x,e->y,dx,dy,e->type);bullet(e->x,e->y,(dx-dy)*181/256,(dx+dy)*181/256,e->type);bullet(e->x,e->y,(dx+dy)*181/256,(dy-dx)*181/256,e->type);}
    if(a==3){bullet(e->x+(e->x<128*32?28*32:-28*32),e->y,0,30,e->type);e->timer=21600;}
    if(a==4)bullet(e->x,e->y,0,30,e->type);
}
static void beamHit(u16 angle) {
    s16 dx,dy,c,s,along,across;
    /* Two-pixel units keep the dot products inside signed 16-bit arithmetic. */
    dx=(px-bx)>>6;dy=(py-by)>>6;c=sintab[(angle+64)&255];s=sintab[angle];
    along=(((dx*c)>>1)+((dy*s)>>1))>>6;across=(((-dx*s)>>1)+((dy*c)>>1))>>6;
    if(along>6 && absolute(across)<4)die();
}
static void bossStep(void) {
    u16 a,k; s16 target,sweep,x;
    if(!bossMode || bossDone)return;
    target=bossMode==1?38:bossPhase==3?3:85;
    if(by<target*32)by+=36;if(by>target*32)by-=36;
    if(bossMode==1)return;
    if(absolute(px-bx)<10*32 && absolute(py-by)<12*32)die();
    if(by<84*32 && bossPhase!=3)return;
    bossTick+=2;
    if(bossPhase==1 && (bossHp<400 || bossTick>1800)){bossPhase=2;bossHp=400;}
    if(bossPhase==2 && (bossHp<200 || bossTick>3600)){bossPhase=3;bossHp=200;wallClock=0;}
    if(bossHp<30 || bossTick>4800){bossKilled=bossHp<30;bossDone=1;bossPhase=4;playSound(1);return;}
    if(bossPhase==1 || (bossPhase==3 && bossTick>4200)) {
        sweep=(sintab[(bossTick*3/5)&255]*32)>>8;
        beamHit((128-sweep)&255);beamHit(sweep&255);
    }
    if(bossPhase==2)for(k=0;k<4;k++)beamHit((bossTick*3/5+k*64+32)&255);
    if(bossPhase==3) {
        if(wallClock)wallClock=wallClock>2?wallClock-2:0;
        else {
            wallClock=120;a=85+random()%45;
            for(x=58;x<a;x+=6)bullet(x*32,by+20*32,0,16+(random()&7),1);
        }
    }
}
void stepGame(void) {
    u16 i,j,a; s16 dx,dy,vel;Enemy *e;Bullet *b,*s;
    if(invincible)invincible=invincible>2?invincible-2:0;
    if(alive) {
        vel=(pad&KEY_X)?46:90;
        if(pad&KEY_LEFT)px-=vel;if(pad&KEY_RIGHT)px+=vel;if(pad&KEY_UP)py-=vel;if(pad&KEY_DOWN)py+=vel;
        if(px<70*32)px=70*32;if(px>186*32)px=186*32;if(py<12*32)py=12*32;if(py>212*32)py=212*32;
        if(pad&(KEY_A|KEY_B|KEY_Y)){if(held<900)held+=2;power=1+held/300;}
        else{held=0;power=1;}
    }
    slowClock+=11-power;if(slowClock<10)return;slowClock-=10;gameTick+=2;
    if(shotClock)shotClock=shotClock>2?shotClock-2:0;
    if(alive && (pad&(KEY_A|KEY_B|KEY_Y)) && !shotClock) {
        for(i=0;i<SHOTS;i++)if(!shots[i].active){shots[i].active=1;shots[i].x=px;shots[i].y=py-8*32;break;}
        shotClock=6;playSound(0);
    }
    stageStep();if(mode!=1)return;bossStep();
    for(i=0,e=enemies;i<ENEMIES;i++,e++)if(e->active) {
        e->age+=2;dx=0;dy=22;
        if(e->move==1){dx=(px-e->x)>>5;dy=(py-e->y)>>5;a=absolute(dx)+absolute(dy);if(a)dx=dx*22/a;dy=22;}
        if(e->move==2){dx=11;dy=19;}if(e->move==3){dx=-11;dy=19;}
        if(e->move==4 || e->move==5){a=e->age>510?510:e->age;/* exponential turn, sampled from the Unity movement */dx=turnX[a];dy=turnY[a];if(e->move==5)dx=-dx;}
        if(e->move==6 && e->y>=58*32){dx=0;dy=0;}
        if(e->move==23){dx=0;dy=0;}
        e->x+=dx*2;e->y+=dy*2;
        if(e->timer)e->timer=e->timer>2?e->timer-2:0;
        if(!e->timer && alive){e->timer=e->interval;attack(e);}
        if(absolute(px-e->x)<9*32 && absolute(py-e->y)<10*32)die();
        if(e->y>242*32 || e->x<40*32 || e->x>216*32)e->active=0;
    }
    for(i=0,s=shots;i<SHOTS;i++,s++)if(s->active) {
        s->y-=374;
        if(s->y< -10*32){s->active=0;continue;}
        if(bossMode==2 && !bossDone && absolute(s->x-bx)<11*32 && absolute(s->y-by)<15*32){bossHp--;s->active=0;continue;}
        for(j=0,e=enemies;j<ENEMIES;j++,e++)if(e->active && absolute(s->x-e->x)<8*32 && absolute(s->y-e->y)<10*32){
            s->active=0;if(--e->hp==0){e->active=0;score+=100;playSound(1);}break;
        }
    }
    for(i=0,b=bullets;i<BULLETS;i++,b++)if(b->active) {
        b->x+=b->vx*2;b->y+=b->vy*2;
        if(b->x<56*32 || b->x>200*32 || b->y< -12*32 || b->y>236*32){b->active=0;continue;}
        if(absolute(px-b->x)<3*32 && absolute(py-b->y)<3*32){die();b->active=0;}
    }
}
