﻿using UnityEngine;
using UnityEngine.SceneManagement;
using System.Collections;

public class ApplicationManager : MonoBehaviour {
    private void Start()
    {
        Time.timeScale = 0.5f;
    }

    public void StartButtonLoadScene()
    {
        SceneManager.LoadScene("Demo_Scene");
    }
    public void CreditButtonLoadScene()
    {
        SceneManager.LoadScene("Credit");
    }

    public void Quit () 
	{
		#if UNITY_EDITOR
		UnityEditor.EditorApplication.isPlaying = false;
		#else
		Application.Quit();
		#endif
	}
}
