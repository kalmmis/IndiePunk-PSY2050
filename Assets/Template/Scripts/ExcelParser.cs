using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.IO;

public class ExcelParser : MonoBehaviour
{
    static string m_resourcePath = "Assets/Resources/level";
    public static string GetLevel(int i)
    {
        FileStream f = new FileStream(m_resourcePath+i+".csv", FileMode.Open, FileAccess.Read)  ;
        StreamReader reader = new StreamReader(f, System.Text.Encoding.UTF8);
        string stageStr =reader.ReadToEnd();
        return stageStr;
    }

}
