using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using System.Threading;
public class Logo : MonoBehaviour
{

    private float fadePerSecond = 1f;
    GameObject go;
    RawImage logo;
    byte i;
    bool fadeIn;
    void Start()
    {
        fadeIn = true;
        Time.timeScale = 1f;
        go = GameObject.FindGameObjectWithTag("logo");
        logo = go.GetComponent<RawImage>();
        i = 255;
        logo.color = new Color(logo.color.r, logo.color.g, logo.color.b, 0);
    }

    // Update is called once per frame
    void Update()
    {
        if(logo.color.a > 1)
        {
            fadeIn = false;

        }
        if (logo.color.a < 0)
        {
            SceneManager.LoadScene("StartMenu");
        }
        Debug.Log(logo.color);
        Debug.Log(fadeIn);
        
        if (fadeIn)
        {
            logo.color = new Color(logo.color.r, logo.color.g, logo.color.b, logo.color.a + fadePerSecond*Time.fixedDeltaTime);
        }
        else
        {
            logo.color = new Color(logo.color.r, logo.color.g, logo.color.b, logo.color.a - fadePerSecond * Time.fixedDeltaTime);
        }

    }
}
