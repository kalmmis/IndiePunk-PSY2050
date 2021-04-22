using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
public class StoryScriptParser
{
    public void test()
    {
        var sdt = new StoryDataTest();
        string json =  sdt.getTestJson();
        //Debug.Log(json);
        var sdtData = JObject.Parse(json);
        //Debug.Log(sdtData.ToString());
        var s = sdtData["data"][0]["MainStory001_start"]["data"].Values();
        Debug.Log(s);
        foreach ( JToken j in s)
        {
            //Debug.Log(j.); 
            Debug.Log(j["NpcNameText"].Value<string>());
        }
        
        //var jsons = new JObject();
        //jsons.Add("type", "test");
        //jsons.Add("number", 124f);
        //Debug.Log(json.ToString());
    }
}

