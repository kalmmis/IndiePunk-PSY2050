#include "game.h"
u16 textMap[1024];
u16 spriteObject;
void spriteFast(s16 x,s16 y,u16 tile,u16 pal,u16 large);
void beamRender(s16 x,s16 y,s16 dx,s16 dy);
void clearSprites(void);
static u8 layout;
static u16 portraitMap[1024],portraitIds[2];
static u16 colors[4]={0,0x1003,0x7f40,0x7fff};

void clearText(void) { u16 i; for(i=0;i<1024;i++)textMap[i]=0; }
void putText(u16 x,u16 y,char *s) {
    while(*s && x<32) { textMap[y*32+x]=(*s>=32 ? *s-32+2 : 0)|(7<<10)|0x2000;x++;s++; }
}
void uploadText(void) { WaitForVBlank();dmaCopyVram((u8*)textMap,0x6800,2048); }
void initVideo(void) {
    portraitIds[0]=0;portraitIds[1]=0;
    setScreenOff();oamInit();setMode(BG_MODE1,BG3_MODE1_PRIORITY_HIGH);
    bgSetMapPtr(0,0x6000,SC_32x32);bgSetMapPtr(1,0x6400,SC_32x32);bgSetMapPtr(2,0x6800,SC_32x32);
    dmaCopyCGram((u8*)colors,28,8);
}
void titleScreen(void) {
    setScreenOff();clearSprites();layout=0;
    bgSetGfxPtr(0,0x1000);bgSetGfxPtr(2,0x5000);
    dmaCopyVram(&title_pic,0x1000,title_size);dmaCopyVram(&title_map,0x6000,2048);dmaCopyCGram(&title_pal,0,32);
    dmaCopyVram(&font_pic,0x5000,1792);dmaCopyCGram((u8*)colors,28,8);
    bgSetScroll(0,0,0);bgSetScroll(2,0,0);
    bgSetEnable(0);bgSetDisable(1);bgSetEnable(2);
    clearText();putText(6,20,"A / START : NEW GAME");putText(5,22,"UP/DOWN : SELECT CHAPTER");
    putText(5,24,"B : FIRE   X : FOCUS");putText(5,26,"SELECT : SKIP DIALOGUE");uploadText();setScreenOn();
}
void playScreen(void) {
    u16 i;
    setScreenOff();clearSprites();layout=1;
    oamInitGfxSet(&sprites_pic,16384,&sprites_pal,256,0,0x0000,OBJ_SIZE8_L32);
    bgSetGfxPtr(0,0x3000);bgSetGfxPtr(1,0x4000);bgSetGfxPtr(2,0x2000);
    dmaCopyVram(&road_pic,0x3000,road_size);dmaCopyVram(&road_map,0x6000,2048);dmaCopyCGram(&road_pal,0,32);
    dmaCopyVram(&font_pic,0x2000,1792);dmaCopyCGram((u8*)colors,28,8);
    clearText();dmaCopyVram((u8*)textMap,0x6400,2048);uploadText();
    bgSetEnable(0);bgSetEnable(2);bgSetDisable(1);
    for(i=0;i<3;i++)bgSetScroll(i,0,0);
    setPaletteColor(128+5*16+1,0x23ff);
    setScreenOn();
}
static void number(u16 x,u16 y,u16 n,u16 digits) {
    char buf[7];u16 k;buf[digits]=0;
    for(k=digits;k>0;k--){buf[k-1]='0'+n%10;n/=10;}putText(x,y,buf);
}
static void hud(void) {
    putText(0,2,"PSY");putText(0,3,"2050");putText(0,7,"STAGE");number(1,9,stage==4?10:stage+1,2);
    putText(0,13,"SCORE");number(0,15,score,5);
    putText(26,2,"TIME");putText(26,4,power==4?"70%":power==3?"80%":power==2?"90%":"100%");
    putText(26,8,"POWER");number(28,10,power,1);
    putText(26,15,assist?"HELP":"HOLD");putText(26,17,assist?"ON":"FIRE");
    if(bossMode==2){putText(26,20,"BOSS");number(26,22,bossHp>0?bossHp:0,3);}
}
void drawScene(void) {
    u16 i,j,t; s16 x,y,dx,dy;u16 angle;u8 k;
    Enemy *e;Bullet *b;
    clearSprites();spriteObject=0;
    if(alive && (!invincible || (frame&2)))spriteFast((px>>5)-16,(py>>5)-16,((frame>>2)&3)*4,0,OBJ_LARGE);
    if(bossMode && !bossDone) {
        t=64+((frame>>2)%3)*128;x=(bx>>5)-32;y=(by>>5)-32;
        spriteFast(x,y,t,1,OBJ_LARGE);spriteFast(x+32,y,t+4,1,OBJ_LARGE);spriteFast(x,y+32,t+64,1,OBJ_LARGE);spriteFast(x+32,y+32,t+68,1,OBJ_LARGE);
    }
    for(i=0,e=enemies;i<ENEMIES;i++,e++)if(e->active){t=e->type; spriteFast((e->x>>5)-16,(e->y>>5)-16,72+(t&1)*4+(t>>1)*64,2,OBJ_LARGE);}
    for(i=0,b=shots;i<SHOTS;i++,b++)if(b->active)spriteFast((b->x>>5)-4,(b->y>>5)-4,200,3,OBJ_SMALL);
    for(i=0,b=bullets;i<BULLETS;i++,b++)if(b->active)spriteFast((b->x>>5)-4,(b->y>>5)-4,201+(b->type&1),3,OBJ_SMALL);
    if(bossMode==2 && !bossDone && by<=88*32 && (bossPhase<3 || bossTick>4200)) {
        for(k=0;k<(bossPhase==2?4:2);k++) {
            if(bossPhase!=2)angle=k?((sintab[(bossTick*3/5)&255]*32)>>8)&255:(128-((sintab[(bossTick*3/5)&255]*32)>>8))&255;
            else angle=((bossTick*3/5)+k*64+32)&255;
            dx=sintab[(angle+64)&255];dy=sintab[angle];
            beamRender(bx,by,dx,dy);
        }
    }
    if(mode==1 && (frame&15)==0){hud();uploadText();}
}
void showLine(const Line *line) {
    setScreenOff();dmaCopyVram(line->pic,0x2400,line->size);dmaCopyVram(line->map,0x6800,2048);setScreenOn();
}
void portrait(u16 arg) {
    u16 id=arg&15,side=arg>>4,i,x,y,t;
    /* Rebuild both sides from their current IDs rather than erasing a previous portrait. */
    portraitIds[side]=id;setScreenOff();
    for(i=0;i<1024;i++)portraitMap[i]=0;
    for(side=0;side<2;side++)if(portraitIds[side]) {
        id=portraitIds[side]-1;
        dmaCopyVram(portraitPics[id],0x4000+(1+side*96)*16,3072);dmaCopyCGram(portraitPals[id],32+side*16,32);
        for(y=0;y<12;y++)for(x=0;x<8;x++){t=1+side*96+y*8+x;portraitMap[(6+y)*32+x+(side?23:1)]=t|((2+side)<<10)|0x2000;}
    }
    dmaCopyVram((u8*)portraitMap,0x6400,2048);bgSetEnable(1);setScreenOn();
}
void dialogueEnd(void) {
    setScreenOff();clearText();uploadText();bgSetDisable(1);setScreenOn();
    portrait(0);portrait(16);bgSetDisable(1);
}
