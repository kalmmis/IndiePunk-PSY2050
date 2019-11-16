using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using System.Threading;
public class Logo : MonoBehaviour
{

    [SerializeField] private float fadePerSecond = 0.0000000000000001f;
    GameObject go;
    RawImage logo;
    byte i;
    bool fadeIn = true;
    void Start()
    {
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
        if (fadeIn)
        {
            logo.color = new Color(logo.color.r, logo.color.g, logo.color.b, logo.color.a + (fadePerSecond*Time.fixedDeltaTime)*0.18f);
        }
        else
        {
            logo.color = new Color(logo.color.r, logo.color.g, logo.color.b, logo.color.a - (fadePerSecond * Time.fixedDeltaTime) * 0.18f);
        }

    }
}
