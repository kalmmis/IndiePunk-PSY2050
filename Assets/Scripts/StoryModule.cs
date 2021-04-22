using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class StoryModule : MonoBehaviour
{
    // Start is called before the first frame update
    Image npc1    ;
    Image npc2    ;
    Image npc3    ;
    Text TextBody ;
    Text TextName;  

    void Start()
    {
        var sscp = new StoryScriptParser();
        sscp.test();
        npc1 = GameObject.Find("NpcBackgroundImage1").GetComponent<Image>();
        npc2 = GameObject.Find("NpcBackgroundImage2").GetComponent<Image>();
        npc3 = GameObject.Find("NpcBackgroundImage3").GetComponent<Image>();
        TextBody = GameObject.Find("StoryText").GetComponent<Text>();
        TextName = GameObject.Find("NpcNameText").GetComponent<Text>();
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
