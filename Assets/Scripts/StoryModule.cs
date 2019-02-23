using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class StoryModule : MonoBehaviour
{
    // Start is called before the first frame update
    void Start()
    {

        var sscp = new StoryScriptParser();
        sscp.test();
    }

    // Update is called once per frame
    void Update()
    {
        
    }
}
