using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
        
public class Credit : MonoBehaviour
{
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        Debug.Log("Transform : " + transform.position.y);
        if (transform.position.y > 90f)
        {
            SceneManager.LoadScene("StartMenu");
        }
        else
        {
            transform.Translate(Vector3.up * 15f * Time.deltaTime);
        }
        
        
    }
}
