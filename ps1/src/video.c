#include "game.h"
#include <stddef.h>
#include <string.h>
#include <stdio.h>
#include <psxgpu.h>
#include <psxetc.h>

#define PACKET_BYTES 65536
typedef struct { DISPENV disp; DRAWENV draw; u32 ot[16]; u8 packets[PACKET_BYTES]; } Buffer;
static Buffer buffers[2];
static u8 active;
static u8 *packet;
static char ui[30][41];
static u16 portraits[2];
static const Line *currentLine;
u16 renderOverflow=0;

static void *primitive(u16 z,u16 size) {
    void *p=packet;
    if(packet+size>buffers[active].packets+PACKET_BYTES){renderOverflow=1;return buffers[active].packets;}
    packet+=size;addPrim(&buffers[active].ot[z],p);return p;
}
static void upload(int x,int y,int w,int h,const u8 *data) {
    RECT r={x,y,w,h};LoadImage(&r,(const u32*)data);DrawSync(0);
}
static void rectangle(int z,int x,int y,int w,int h,int r,int g,int b) {
    TILE *p=primitive(z,sizeof(TILE));setTile(p);setXY0(p,x,y);setWH(p,w,h);setRGB0(p,r,g,b);
}
static void texture(int z,int x,int y,int w,int h,int u,int v,int tw,int th,int page,int clut,int r,int g,int b) {
    POLY_FT4 *p=primitive(z,sizeof(POLY_FT4));setPolyFT4(p);
    setXY4(p,x,y,x+w,y,x,y+h,x+w,y+h);setUV4(p,u,v,u+tw-1,v,u,v+th-1,u+tw-1,v+th-1);
    setRGB0(p,r,g,b);p->tpage=page;p->clut=clut;
}
static void ascii(int x,int y,const char *s) {packet=(u8*)FntSort(buffers[active].ot,packet,x,y,s);}
static void glyphText(int x,int y,const u16 *s,int cyan) {
    int start=x;
    if(!s)return;
    for(int guard=0;*s && guard<200;guard++,s++) {
        if(*s==65535){x=start;y+=14;continue;}
        int id=*s-1;
        texture(0,x,y,16,16,(id&15)*16,((id>>4)&15)*16,16,16,getTPage(0,0,320+(id>>8)*64,0),getClut(0,480),cyan?32:128,128,128);
        x+=fontAdvance[*s];
    }
}
void clearText(void){memset(ui,' ',sizeof(ui));for(int y=0;y<30;y++)ui[y][40]=0;}
void putText(u16 x,u16 y,char *s){
    int col=x<7?x+1:x>=25?x+5:x+4;
    if(y>=30)return;
    while(*s && col<40)ui[y][col++]=*s++;
}
void uploadText(void){}
void initVideo(void) {
    ResetGraph(0);
    for(int i=0;i<2;i++) {
        SetDefDrawEnv(&buffers[i].draw,0,i*240,320,240);SetDefDispEnv(&buffers[i].disp,0,i*240,320,240);
        setRGB0(&buffers[i].draw,3,6,16);buffers[i].draw.isbg=1;buffers[i].draw.dtd=1;
    }
    FntLoad(960,256);
    upload(0,480,16,1,font_pal);
    for(int i=0;i<fontPages;i++)upload(320+i*64,0,64,256,fontPics[i]);
    active=0;renderOverflow=0;SetDispMask(1);
}
void titleScreen(void) {
    DrawSync(0);upload(512,0,320,240,title_pic);clearText();currentLine=0;portraits[0]=portraits[1]=0;
}
void playScreen(void) {
    DrawSync(0);upload(512,0,160,256,road_pic);upload(704,0,128,256,actors_pic);upload(832,0,128,256,portraits_pic);
    upload(16,480,256,1,actors_pal);upload(272,480,256,1,portraits_pal);upload(528,480,256,1,portraits_gray_pal);
    clearText();currentLine=0;portraits[0]=portraits[1]=0;
}
void showLine(const Line *line){currentLine=line;}
void portrait(u16 arg){portraits[arg>>4]=arg&15;}
void dialogueEnd(void){currentLine=0;portraits[0]=portraits[1]=0;clearText();}

static void actor(s16 x,s16 y,int u,int v,int w,int h) {
    texture(7,32+(x>>5)-w/2,8+(y>>5)-h/2,w,h,u,v,w,h,getTPage(1,0,704,0),getClut(16,480),128,128,128);
}
static void beam(u16 angle) {
    int dx=sintab[(angle+64)&255],dy=sintab[angle];
    int x=32+(bx>>5),y=8+(by>>5),ex=x+dx,ey=y+dy;
    int nx=-(dy*3)>>8,ny=(dx*3)>>8;
    POLY_F4 *p=primitive(9,sizeof(POLY_F4));setPolyF4(p);
    setXY4(p,x+nx,y+ny,x-nx,y-ny,ex+nx,ey+ny,ex-nx,ey-ny);setRGB0(p,255,100,28);
    p=primitive(8,sizeof(POLY_F4));setPolyF4(p);nx=-(dy)>>8;ny=dx>>8;
    setXY4(p,x+nx,y+ny,x-nx,y-ny,ex+nx,ey+ny,ex-nx,ey-ny);setRGB0(p,255,243,176);
}
static void scene(void) {
    int scroll=(gameTick/2)&255;
    texture(15,80,-scroll,160,256,0,0,160,256,getTPage(2,0,512,0),0,128,128,128);
    texture(15,80,256-scroll,160,256,0,0,160,256,getTPage(2,0,512,0),0,128,128,128);
    rectangle(4,0,0,80,240,3,6,17);rectangle(4,240,0,80,240,3,6,17);
    rectangle(3,78,0,1,240,40,100,139);rectangle(3,240,0,1,240,40,100,139);
    if(alive && (!invincible || (frame&4)))actor(px,py,(held?4+((frame>>3)%3):(frame>>3)%4)*32,0,32,48);
    if(bossMode && !bossDone)actor(bx,by,((frame>>3)%3)*64,48,64,64);
    for(int i=0;i<ENEMIES;i++)if(enemies[i].active)actor(enemies[i].x,enemies[i].y,enemies[i].type*32,112,32,32);
    for(int i=0;i<SHOTS;i++)if(shots[i].active)actor(shots[i].x,shots[i].y,0,144,16,16);
    for(int i=0;i<BULLETS;i++)if(bullets[i].active)actor(bullets[i].x,bullets[i].y,16+(bullets[i].type&1)*16,144,16,16);
    if(bossMode==2 && !bossDone && by<=88*32 && (bossPhase<3 || bossTick>4200)) {
        for(int i=0;i<(bossPhase==2?4:2);i++)beam(bossBeamAngle(i));
    }
}
static void hud(void) {
    char s[40];ascii(12,16,"PSY2050");ascii(12,56,"CHAPTER");sprintf(s,"%02d",stage==4?10:stage+1);ascii(28,72,s);
    ascii(12,112,"SCORE");sprintf(s,"%05d",score);ascii(12,128,s);
    ascii(254,16,"TIME");sprintf(s,"%d%%",100-(power-1)*10);ascii(254,32,s);
    ascii(252,64,"POWER");sprintf(s,"%d / 4",power);ascii(252,80,s);
    ascii(252,120,assist?"HELP ON":"HOLD X");ascii(250,136,assist?"PRACTICE":"TO SLOW");
    if(bossMode==2){ascii(252,176,"REINA");sprintf(s,"%03d",bossHp>0?bossHp:0);ascii(260,192,s);rectangle(2,252,208,56,3,25,35,58);rectangle(1,252,208,56*(bossHp>0?bossHp:0)/600,3,242,86,125);}
}
void renderFrame(void) {

    ClearOTagR(buffers[active].ot,16);packet=buffers[active].packets;

    if(mode==0) {
        texture(15,0,0,256,240,0,0,256,240,getTPage(2,0,512,0),0,128,128,128);
        texture(15,256,0,64,240,0,0,64,240,getTPage(2,0,768,0),0,128,128,128);
    } else {

        scene();


        if(mode==1)hud();
        if(mode==2 && currentLine) {

            for(int side=0;side<2;side++)if(portraits[side]) {
                int id=portraits[side]-1;
                texture(3,side?228:8,0,84,160,(id/2)*84,0,84,160,getTPage(1,0,832,0),getClut((id&1)?528:272,480),128,128,128);
            }

            rectangle(2,0,160,320,80,9,10,31);rectangle(1,0,160,320,1,65,196,220);

            glyphText(10,164,currentLine->speaker,1);glyphText(10,181,currentLine->text,0);ascii(304,227,">");
        }
    }
    if(mode!=2)for(int y=0;y<30;y++)if(ui[y][0])ascii(0,y*8,ui[y]);
    DrawSync(0);VSync(0);
    PutDispEnv(&buffers[active^1].disp);DrawOTagEnv(&buffers[active].ot[15],&buffers[active].draw);SetDispMask(1);active^=1;
}
