using System.Collections;
using System.Collections.Generic;
using UnityEngine;
public class StoryDataTest 
{
    public string getTestJson()
    {
        return "{\"data\":[{\"MainStory001_start\" : { \"title\": \"시작의 서\", \"data\": [{\"NpcNameText\": \"player\", \"text\": \"여긴 어디지?\"},{\"NpcNameText\": \"player\", \"text\": \"누군가 다가오고 있어.\"},{\"Command\":{\"NpcBackgroundImage1\" : \"npc1\"}},{\"NpcNameText\" : \"npc1\", \"text\" : \"어머, 안녕하세요.\"},{\"NpcNameText\" : \"npc1\", \"text\" : \"이런 외진 곳에 사람이 방문할 줄은 몰랐네요.\"},{\"NpcNameText\" : \"player\", \"text\" : \"여기는 어디야?\"},{\"NpcNameText\" : \"npc1\", \"text\" : \"여기는 히랄다의 숲이에요.\\n저를 따라오세요.\"},{\"Command\":{\"NpcBackgroundImage1\" : \"null\"}},{\"NpcNameText\" : \"blank\", \"text\" : \"여성은 숲속으로 사라졌다.\\n뒤를 따라가보자.\"}]}},{\"MainStory002_selection\" : { \"title\": \"선택지에 대해\", \"data\": [{\"NpcNameText\" : \"player\", \"text\" : \"저 멀리서 누군가 다가온다.\"},{\"NpcNameText\" : \"player\", \"text\" : \"다가온 것은 <npc2>였다.\\n그녀가 대뜸 물었다.\"},{\"SetRoute\" : \"RouteMainStory002_1\"},{\"Command\":{\"NpcBackgroundImage3\" : \"npc2\"}},{\"NpcNameText\" : \"npc2\", \"selection\" : \"3+4는 몇일까요?\"},{\"choice1_text\" : \"6이다.\", \"choice1\" : [{\"NpcNameText\" : \"npc2\", \"text\" : \"틀렸습니다.\\n다시 한 번 물어볼게요.\"},{\"Move\" : \"RouteMainStory002_1\"},]},{\"choice2_text\" : \"7이다.\", \"choice2\" : [{\"NpcNameText\" : \"npc2\", \"text\" : \"맞아요.\"},{\"NpcNameText\" : \"npc2\", \"text\" : \"계산을 참 잘 하시네요.\"},{\"Move\" : \"RouteMainStory002_2\"},]},{\"SetRoute\" : \"RouteMainStory002_2\"},{\"NpcNameText\" : \"npc2\", \"text\" : \"그 말을 끝으로 <npc2>는 돌아가버렸다.\"},{\"Command\":{\"NpcBackgroundImage3\" : \"null\"}}]}}]}";
    }
}
