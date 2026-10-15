#include "game.h"
#include <psxapi.h>
#include <stdio.h>
u16 frame,score,stage,row,wait,held,invincible,bossTick,gameTick;
u16 pad,pressed,nextStage,lineIndex;
u8 power=1,alive=1,bossMode,bossPhase,bossDone,bossKilled,mode,paused,assist;
static u8 waitingBoss;
static u16 previous,deathWait,selected;

void beginBoss(u16 action) {
    if(action==0){bossMode=1;bossDone=0;bossKilled=0;bossPhase=0;bx=128*32;by=-12*32;bossHp=1000;}
    if(action==1){bossMode=2;bossPhase=1;bossTick=0;bossHp=600;}
    if(action==2)bossMode=0;
}
void startStage(u16 n) {
    u16 i;
    stage=n;row=stageFirst[n];wait=rows[row].wait;nextStage=999;waitingBoss=0;
    held=0;power=1;alive=1;px=128*32;py=200*32;bossMode=0;bossDone=0;bossKilled=0;bossPhase=0;gameTick=0;
    invincible=180;deathWait=0;paused=0;mode=1;
    for(i=0;i<ENEMIES;i++)enemies[i].active=0;
    for(i=0;i<SHOTS;i++)shots[i].active=0;
    for(i=0;i<BULLETS;i++)bullets[i].active=0;
    playScreen();
}
void advanceDialogue(u8 skip) {
    const Line *l;u16 guard=0;
    while(guard++<600) {
        l=&lines[lineIndex++];
        if(l->type==1){mode=1;dialogueEnd();return;}
        if(l->type==2 && nextStage==999)nextStage=l->arg;
        if(l->type==3 && !skip)portrait(l->arg);
        if(l->type==0 && !skip){showLine(l);return;}
    }
    mode=1;dialogueEnd();
}
void stageStep(void) {
    const Row *r;const Spawn *s;Enemy *e;u16 i,j;
    if(waitingBoss){if(!bossDone)return;waitingBoss=0;row++;if(row<stageLast[stage])wait=rows[row].wait;}
    if(row>=stageLast[stage]) {
        if(nextStage==999){mode=3;clearText();putText(9,8,"PSY2050");putText(9,11,"THE END");putText(5,15,"THANK YOU FOR PLAYING");putText(5,18,"ORIGINAL : INDIEPUNK");putText(5,24,"START : TITLE");uploadText();return;}
        startStage(nextStage==10?4:nextStage-1);return;
    }
    if(wait){wait--;return;}
    r=&rows[row];
    if(r->type==1) {
        lineIndex=bossKilled?r->alt:r->arg;row++;if(row<stageLast[stage])wait=rows[row].wait;
        mode=2;portrait(0);portrait(16);advanceDialogue(0);return;
    }
    if(r->type==2){beginBoss(r->arg);if(r->arg==1){waitingBoss=1;return;}}
    else for(i=0;i<r->count;i++) {
        s=&spawns[r->first+i];
        for(j=0;j<ENEMIES;j++)if(!enemies[j].active) {
            e=&enemies[j];e->active=1;e->x=s->x*32;e->y=-10*32;e->type=s->type;e->move=s->move;e->attack=s->attack;
            e->interval=s->interval;e->timer=1;e->age=0;e->hp=s->type==3?15:s->type==2?1:5;break;
        }
    }
    row++;if(row<stageLast[stage])wait=rows[row].wait;
}
static u8 padBuffers[2][34];
int main(void) {
    frame=0;score=0;stage=0;mode=0;paused=0;assist=0;selected=0;previous=0;waitingBoss=0;
    initVideo();
    InitPAD(padBuffers[0],34,padBuffers[1],34);StartPAD();ChangeClearPAD(0);
    initAudio();titleScreen();
    while(1) {
        frame++;PADTYPE *controller=(PADTYPE*)padBuffers[0];pad=controller->stat==0?(u16)~controller->btn:0;
        pressed=pad&~previous;previous=pad;audioFrame();
        if(mode==0) {
            if(pressed&KEY_UP)selected=selected?selected-1:4;
            if(pressed&KEY_DOWN)selected=selected<4?selected+1:0;
            if(pressed&KEY_X)assist=!assist;
            clearText();putText(10,20,selected==4?"EPILOGUE":selected==3?"CHAPTER 4":selected==2?"CHAPTER 3":selected==1?"CHAPTER 2":"CHAPTER 1");
            putText(21,20,assist?"HELP ON":"       ");putText(7,22,"X / START : NEW GAME");putText(6,24,"UP/DOWN : SELECT CHAPTER");putText(7,26,"SQUARE : PRACTICE MODE");putText(7,28,"SELECT : SKIP DIALOGUE");
            if(pressed&(KEY_START|KEY_A)){score=0;startStage(selected);}
        } else if((pad&(KEY_SELECT|KEY_START))==(KEY_SELECT|KEY_START)) {mode=0;titleScreen();}
        else if(mode==3) {if(pressed&KEY_START){mode=0;titleScreen();}}
        else if(mode==2) {if(pressed&KEY_SELECT)advanceDialogue(1);else if(pressed&(KEY_A|KEY_B|KEY_START))advanceDialogue(0);}
        else {
            if(pressed&KEY_START){paused=!paused;clearText();if(paused)putText(12,13,"PAUSED");}
            if(!paused) {
                if(!alive) {
                    deathWait++;
                    if(deathWait==120)putText(9,12,"X : RETRY");
                    if(deathWait>=120 && (pressed&(KEY_A|KEY_B))){alive=1;px=128*32;py=200*32;invincible=180;held=0;power=1;deathWait=0;clearText();}
                }
                stepGame();
            }
        }
        renderFrame();
    }
    return 0;
}
